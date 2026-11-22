export function formatNaira(kobo: number): string {
    let Naira:number = kobo/100
  return `₦${Naira.toLocaleString("en-NG")}`;
}