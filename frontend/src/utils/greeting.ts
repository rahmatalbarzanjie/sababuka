/** Sapaan menurut jam setempat. */
export function greetingFor(hour: number): string {
  return hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
}
