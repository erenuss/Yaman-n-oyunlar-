// Replikler: oyun ve ses üretici (scripts/hk-voices.py) aynı kaynağı kullanır.
export const SCRIPT = [
  ['h', 'Hay Hak! Yâr bana bir eğlence, medet!'],
  ['k', 'Eğlence mi istedin? Al sana eğlence, Hacivat!'],
  ['h', 'Aman Karagöz’üm, efendim, nereden çıktın böyle?'],
  ['k', 'Perdenin arkasından çıktım, nereden olacak!'],
  ['h', 'Biraz nezaket, biraz edep lütfen efendim.'],
  ['k', 'Nezaket mi? O hangi mahallede oturuyor?'],
  ['h', 'Nezaket mahalle değil, terbiyedir, terbiye!'],
  ['k', 'Terbiye mi? Ben turşu terbiyesini bilirim!'],
  ['h', 'Of of... Seninle konuşmak taşa su dökmek gibi.'],
  ['k', 'Taşa dökme o zaman, testiye dök şu suyu!'],
  ['h', 'Karagöz’üm, sana para kazandıracak bir iş buldum.'],
  ['k', 'Para mı dedin? Kulaklarım bayram etti!'],
  ['h', 'Bursa’dan İstanbul’a mektup taşıyacaksın.'],
  ['k', 'Yürüyerek mi? Bacaklarım tahta değil ya!'],
  ['h', 'Tahta değil, deridir efendim, deve derisi!'],
  ['k', 'İşte bak! Bunu da sen söyledin Hacivat!'],
  ['h', 'Şakayı bırak da sözümü dinle bir kere.'],
  ['k', 'Dinliyorum, iki kulağım da sende!'],
  ['h', 'Kulakları değil, aklını bana ver efendim.'],
  ['k', 'Aklımı verirsem ben ne ile düşüneceğim?'],
  ['h', 'Ah Karagöz, gene perdeyi birbirine kattın!'],
  ['k', 'Yıktın perdeyi, eyledin viran! Varayım sahibine haber vereyim!'],
  ['h', 'Sürç-i lisan ettikse affola!']
];
export const OUCH = { k: ['Ah başım!', 'Ulan Hacivat, ulan!', 'Aman kafam aman!', 'Of of, kafam!'], h: ['Ah efendim, ah!', 'Aman efendim aman!', 'Of of, of of!', 'Vay başım vay!'] };
export const HOP = { k: ['Hop hop hop!', 'Oley be!', 'Hoppala, hop!'], h: ['Hop dedik efendim!', 'Maşallah, maşallah!', 'Ya sabır, ya sabır!'] };
// Ses dosyası adı: metne göre kararlı kısa ad
export function voiceId(code, text) {
  let h = 2166136261; for (const ch of code + '|' + text) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return code + '_' + h.toString(36);
}
