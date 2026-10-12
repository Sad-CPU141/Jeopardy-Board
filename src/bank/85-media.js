/* Picture and sound clues. Files are built by tools/media.js (see media/CREDITS.md).
   The picture/sound is shown with the clue; the response is never in the file name. */
JB_BANK.group('media', '🖼️', 'Pictures & sounds');
(function () {
  var FLAG = 'Flag artwork: flag-icons (MIT)';
  var MAP = 'Outline: Natural Earth (public domain) via world-atlas';
  var KEN = 'Kenney, kenney.nl (CC0)';
  var BB = 'Ben Burnes / Abstraction (CC0)';
  var GEN = 'Generated sound (no source recording)';
  var flag = function (cc) { return { type: 'image', src: '@flag-' + cc, alt: 'A national flag', credit: FLAG, frame: 'flag' }; };
  var shape = function (cc) { return { type: 'image', src: '@shape-' + cc, alt: 'The outline of a country', credit: MAP }; };
  var snd = function (k, credit) { return { type: 'audio', src: '@snd-' + k, credit: credit }; };
  var F = 'This is the national flag of this country.';
  var O = 'This is the outline of this country.';

  JB_BANK.cat('flags', { g: 'media', pop: 1, e: '🏳️', name: 'Flags' }, [
    ['fl01', 200, F, 'Japan', { r: 'Flag of Japan', m: flag('jp') }],
    ['fl02', 200, F, 'Canada', { r: 'Flag of Canada', m: flag('ca') }],
    ['fl03', 200, F, 'Brazil', { r: 'Flag of Brazil', m: flag('br') }],
    ['fl04', 200, F, 'Italy', { r: 'Flag of Italy', m: flag('it') }],
    ['fl05', 400, F, 'South Korea', { r: 'Flag of South Korea', m: flag('kr') }],
    ['fl06', 400, F, 'Switzerland', { r: 'Flag of Switzerland', m: flag('ch') }],
    ['fl07', 400, F, 'Argentina', { r: 'Flag of Argentina', m: flag('ar') }],
    ['fl08', 400, F, 'Greece', { r: 'Flag of Greece', m: flag('gr') }],
    ['fl09', 600, F, 'Jamaica', { r: 'Flag of Jamaica', m: flag('jm') }],
    ['fl10', 600, F, 'Sweden', { r: 'Flag of Sweden', m: flag('se') }],
    ['fl11', 600, F, 'Kenya', { r: 'Flag of Kenya', m: flag('ke') }],
    ['fl12', 600, F, 'Portugal', { r: 'Flag of Portugal', m: flag('pt') }],
    ['fl13', 800, F, 'Nepal', { r: 'Flag of Nepal', f: 'nepal-flag', m: flag('np') }],
    ['fl14', 800, F, 'Bhutan', { r: 'Flag of Bhutan', m: flag('bt') }],
    ['fl15', 800, F, 'Kazakhstan', { r: 'Flag of Kazakhstan', m: flag('kz') }],
    ['fl16', 800, F, 'South Africa', { r: 'Flag of South Africa', m: flag('za') }],
    ['fl17', 1000, F, 'Kiribati', { r: 'Flag of Kiribati', m: flag('ki') }],
    ['fl18', 1000, F, 'Seychelles', { r: 'Flag of Seychelles', m: flag('sc') }],
    ['fl19', 1000, F, 'Belize', { r: 'Flag of Belize', m: flag('bz') }],
    ['fl20', 1000, F, 'Kyrgyzstan', { r: 'Flag of Kyrgyzstan', m: flag('kg') }],
  ]);

  JB_BANK.cat('shapes', { g: 'media', e: '🗺️', name: 'Country Shapes' }, [
    ['sh01', 200, O, 'Australia', { r: 'Australia', m: shape('au') }],
    ['sh02', 200, O, 'India', { r: 'India', m: shape('in') }],
    ['sh03', 200, O, 'Mexico', { r: 'Mexico', m: shape('mx') }],
    ['sh04', 200, O, 'The United Kingdom', { alt: ['UK', 'Great Britain'], r: 'United Kingdom', m: shape('gb') }],
    ['sh05', 400, O, 'Chile', { r: 'Chile', m: shape('cl') }],
    ['sh06', 400, O, 'France', { r: 'Metropolitan France', m: shape('fr') }],
    ['sh07', 400, O, 'Spain', { r: 'Spain', m: shape('es') }],
    ['sh08', 400, O, 'Norway', { r: 'Norway', m: shape('no') }],
    ['sh09', 600, O, 'Vietnam', { r: 'Vietnam', m: shape('vn') }],
    ['sh10', 600, O, 'Madagascar', { r: 'Madagascar', m: shape('mg') }],
    ['sh11', 600, O, 'New Zealand', { r: 'New Zealand', m: shape('nz') }],
    ['sh12', 600, O, 'Thailand', { r: 'Thailand', m: shape('th') }],
    ['sh13', 800, O, 'Cuba', { r: 'Cuba', m: shape('cu') }],
    ['sh14', 800, O, 'Ukraine', { r: 'Ukraine', m: shape('ua') }],
    ['sh15', 800, O, 'Peru', { r: 'Peru', m: shape('pe') }],
    ['sh16', 800, O, 'Poland', { r: 'Poland', m: shape('pl') }],
    ['sh17', 1000, O, 'Laos', { r: 'Laos', m: shape('la') }],
    ['sh18', 1000, O, 'Paraguay', { r: 'Paraguay', m: shape('py') }],
    ['sh19', 1000, O, 'Nicaragua', { r: 'Nicaragua', m: shape('ni') }],
    ['sh20', 1000, O, 'Hungary', { r: 'Hungary', m: shape('hu') }],
  ]);

  JB_BANK.cat('sounds', { g: 'media', pop: 1, e: '👂', name: 'Guess the Sound' }, [
    ['gs01', 200, 'A deck of these is being shuffled.', 'Playing cards', { alt: ['Cards'], m: snd('cards', KEN) }],
    ['gs02', 200, 'Listen as this creaks open.', 'A door', { alt: ['Creaky door'], m: snd('door', KEN) }],
    ['gs03', 200, 'Someone outside has just pressed this.', 'A doorbell', { m: snd('doorbell', GEN) }],
    ['gs04', 200, 'An impatient driver is sounding this.', 'A car horn', { alt: ['Horn'], m: snd('horn', GEN) }],
    ['gs05', 400, 'A referee is blowing one of these.', 'A whistle', { m: snd('whistle', GEN) }],
    ['gs06', 400, 'This wailing comes from one of these kinds of vehicles.', 'An emergency vehicle', { alt: ['Police car', 'Ambulance', 'Fire engine'], m: snd('siren', GEN) }],
    ['gs07', 400, 'This steady ticking comes from one of these.', 'A clock', { alt: ['Watch'], m: snd('clock', GEN) }],
    ['gs08', 400, 'These are being jingled in someone’s hand.', 'Coins', { alt: ['Change', 'Money'], m: snd('coins', KEN) }],
    ['gs09', 600, 'This tool is cutting through paper.', 'Scissors', { r: 'Scissors', m: snd('scissors', BB) }],
    ['gs10', 600, 'Someone is writing with one of these.', 'A pencil', { r: 'Pencil', m: snd('pencil', BB) }],
    ['gs11', 600, 'This home safety device is beeping.', 'A smoke alarm', { r: 'Smoke detector', alt: ['Smoke detector', 'Fire alarm'], m: snd('smoke', GEN) }],
    ['gs12', 600, 'Someone is walking across this.', 'Snow', { r: 'Snow', m: snd('snow', KEN) }],
    ['gs13', 800, 'A truck makes this warning beep while doing this.', 'Reversing', { r: 'Backup beeper', alt: ['Backing up', 'Going backwards'], m: snd('reverse', GEN) }],
    ['gs14', 800, 'This kitchen tool is slicing on a chopping board.', 'A knife', { r: 'Knife', m: snd('knife', KEN) }],
    ['gs15', 800, 'A pair of these is being rolled across a table.', 'Dice', { r: 'Dice', m: snd('dice', KEN) }],
    ['gs16', 800, 'These casino tokens are being stacked and riffled.', 'Poker chips', { r: 'Casino token', alt: ['Casino chips', 'Chips'], m: snd('chips', KEN) }],
    ['gs17', 1000, 'This clicking hand tool tightens nuts without being lifted off them.', 'A ratchet', { r: 'Ratchet (device)', alt: ['Socket wrench', 'Ratchet wrench'], m: snd('ratchet', BB) }],
    ['gs18', 1000, 'This small container is being shaken.', 'A pill bottle', { r: 'Pill bottle', alt: ['Pills', 'Tablets'], m: snd('pills', BB) }],
    ['gs19', 1000, 'On a North American phone line, this tone tells you the line is this.', 'Busy', { r: 'Busy signal', alt: ['Engaged', 'Busy signal'], m: snd('busy', GEN) }],
    ['gs20', 1000, 'This office machine is chopping through a stack of paper.', 'A paper cutter', { r: 'Paper cutter', alt: ['Guillotine', 'Paper guillotine'], m: snd('papercut', BB) }],
  ]);
})();
