import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/webpush';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const bodyData = await request.json();
    const { ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon } = bodyData;

    if (passenger_id !== userData.user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    /* Die Platz-/Status-Pruefung lief bisher nur clientseitig (passenger/list)
       - zwei Leute, die fast gleichzeitig auf denselben letzten Platz tippen,
       oder ein Tipp auf eine Fahrt, die der Fahrer gerade storniert hat,
       konnten beide unbemerkt durchgehen. Hier serverseitig nochmal pruefen,
       direkt vor dem Insert. */
    const { data: ride, error: rideErr } = await supabase
      .from('rides')
      .select('driver_id, status, seats')
      .eq('id', ride_id)
      .single();

    if (rideErr || !ride) return NextResponse.json({ error: "Fahrt nicht gefunden" }, { status: 404 });
    if (ride.status !== 'active') return NextResponse.json({ error: "Diese Fahrt ist nicht mehr aktiv" }, { status: 409 });

    const { count: takenSeats } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('ride_id', ride_id)
      .eq('status', 'accepted');

    if ((takenSeats ?? 0) >= ride.seats) {
      return NextResponse.json({ error: "Diese Fahrt ist bereits voll besetzt" }, { status: 409 });
    }

    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('ride_id', ride_id)
      .eq('passenger_id', passenger_id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (existing) return NextResponse.json({ error: "Du hast diese Fahrt bereits gebucht" }, { status: 409 });

    // Buchung speichern
    const { error: dbError } = await supabase.from('bookings').insert({
      ride_id, passenger_id, passenger_name, passenger_phone, pickup_lat, pickup_lon, status: 'accepted'
    });

    if (dbError) throw new Error("DB Fehler: " + dbError.message);

    if (ride?.driver_id) {
      await sendPushToUser(ride.driver_id, {
        title: "Neuer Mitfahrer! 🙋‍♂️",
        body: `${passenger_name} hat gebucht.`,
        url: "/driver/dashboard",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
