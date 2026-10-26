import type { SportKey } from "@/lib/constants";
import type { HypeSubject } from "./types";

/**
 * Curated team knowledge base: official mascot (when one exists), a widely
 * recognised star, and primary colors. Used to pick the on-screen subject
 * without any web scraping. Entries can be extended freely; anything missing
 * falls back to the optional LLM resolver or a generic team-colors subject.
 *
 * Tuple: [sport, nickname, city, mascot | null, star, color1, color2]
 */
type Row = [SportKey, string, string, string | null, string, string, string];

const ROWS: Row[] = [
  // NBA
  ["NBA", "Hawks", "Atlanta", "Harry the Hawk", "Trae Young", "#C8102E", "#FDB927"],
  ["NBA", "Celtics", "Boston", "Lucky the Leprechaun", "Jayson Tatum", "#007A33", "#BA9653"],
  ["NBA", "Nets", "Brooklyn", null, "Cam Thomas", "#000000", "#FFFFFF"],
  ["NBA", "Hornets", "Charlotte", "Hugo the Hornet", "LaMelo Ball", "#1D1160", "#00788C"],
  ["NBA", "Bulls", "Chicago", "Benny the Bull", "Coby White", "#CE1141", "#000000"],
  ["NBA", "Cavaliers", "Cleveland", "Moondog", "Donovan Mitchell", "#860038", "#FDBB30"],
  ["NBA", "Mavericks", "Dallas", "Champ", "Anthony Davis", "#00538C", "#002B5E"],
  ["NBA", "Nuggets", "Denver", "Rocky the Mountain Lion", "Nikola Jokić", "#0E2240", "#FEC524"],
  ["NBA", "Pistons", "Detroit", "Hooper", "Cade Cunningham", "#C8102E", "#1D42BA"],
  ["NBA", "Warriors", "Golden State", null, "Stephen Curry", "#1D428A", "#FFC72C"],
  ["NBA", "Rockets", "Houston", "Clutch the Bear", "Alperen Şengün", "#CE1141", "#000000"],
  ["NBA", "Pacers", "Indiana", "Boomer", "Tyrese Haliburton", "#002D62", "#FDBB30"],
  ["NBA", "Clippers", "LA", "Chuck the Condor", "Kawhi Leonard", "#C8102E", "#1D428A"],
  ["NBA", "Lakers", "Los Angeles", null, "Luka Dončić", "#552583", "#FDB927"],
  ["NBA", "Grizzlies", "Memphis", "Grizz", "Ja Morant", "#5D76A9", "#12173F"],
  ["NBA", "Heat", "Miami", "Burnie", "Bam Adebayo", "#98002E", "#F9A01B"],
  ["NBA", "Bucks", "Milwaukee", "Bango", "Giannis Antetokounmpo", "#00471B", "#EEE1C6"],
  ["NBA", "Timberwolves", "Minnesota", "Crunch the Wolf", "Anthony Edwards", "#0C2340", "#236192"],
  ["NBA", "Pelicans", "New Orleans", "Pierre the Pelican", "Zion Williamson", "#0C2340", "#C8102E"],
  ["NBA", "Knicks", "New York", null, "Jalen Brunson", "#006BB6", "#F58426"],
  ["NBA", "Thunder", "Oklahoma City", "Rumble the Bison", "Shai Gilgeous-Alexander", "#007AC1", "#EF6024"],
  ["NBA", "Magic", "Orlando", "Stuff the Magic Dragon", "Paolo Banchero", "#0077C0", "#C4CED4"],
  ["NBA", "76ers", "Philadelphia", "Franklin the Dog", "Tyrese Maxey", "#006BB6", "#ED174C"],
  ["NBA", "Suns", "Phoenix", "The Gorilla", "Devin Booker", "#1D1160", "#E56020"],
  ["NBA", "Trail Blazers", "Portland", "Blaze the Trail Cat", "Scoot Henderson", "#E03A3E", "#000000"],
  ["NBA", "Kings", "Sacramento", "Slamson the Lion", "Domantas Sabonis", "#5A2D81", "#63727A"],
  ["NBA", "Spurs", "San Antonio", "The Coyote", "Victor Wembanyama", "#C4CED4", "#000000"],
  ["NBA", "Raptors", "Toronto", "The Raptor", "Scottie Barnes", "#CE1141", "#000000"],
  ["NBA", "Jazz", "Utah", "Jazz Bear", "Lauri Markkanen", "#002B5C", "#F9A01B"],
  ["NBA", "Wizards", "Washington", "G-Wiz", "Alex Sarr", "#002B5C", "#E31837"],
  // NFL
  ["NFL", "Cardinals", "Arizona", "Big Red", "Kyler Murray", "#97233F", "#000000"],
  ["NFL", "Falcons", "Atlanta", "Freddie Falcon", "Bijan Robinson", "#A71930", "#000000"],
  ["NFL", "Ravens", "Baltimore", "Poe", "Lamar Jackson", "#241773", "#9E7C0C"],
  ["NFL", "Bills", "Buffalo", "Billy Buffalo", "Josh Allen", "#00338D", "#C60C30"],
  ["NFL", "Panthers", "Carolina", "Sir Purr", "Bryce Young", "#0085CA", "#101820"],
  ["NFL", "Bears", "Chicago", "Staley Da Bear", "Caleb Williams", "#0B162A", "#C83803"],
  ["NFL", "Bengals", "Cincinnati", "Who Dey", "Joe Burrow", "#FB4F14", "#000000"],
  ["NFL", "Browns", "Cleveland", "Chomps", "Myles Garrett", "#311D00", "#FF3C00"],
  ["NFL", "Cowboys", "Dallas", "Rowdy", "CeeDee Lamb", "#003594", "#869397"],
  ["NFL", "Broncos", "Denver", "Miles", "Bo Nix", "#FB4F14", "#002244"],
  ["NFL", "Lions", "Detroit", "Roary", "Amon-Ra St. Brown", "#0076B6", "#B0B7BC"],
  ["NFL", "Packers", "Green Bay", null, "Jordan Love", "#203731", "#FFB612"],
  ["NFL", "Texans", "Houston", "Toro", "C.J. Stroud", "#03202F", "#A71930"],
  ["NFL", "Colts", "Indianapolis", "Blue", "Jonathan Taylor", "#002C5F", "#A2AAAD"],
  ["NFL", "Jaguars", "Jacksonville", "Jaxson de Ville", "Trevor Lawrence", "#006778", "#D7A22A"],
  ["NFL", "Chiefs", "Kansas City", "KC Wolf", "Patrick Mahomes", "#E31837", "#FFB81C"],
  ["NFL", "Raiders", "Las Vegas", "Raider Rusher", "Maxx Crosby", "#000000", "#A5ACAF"],
  ["NFL", "Chargers", "Los Angeles", null, "Justin Herbert", "#0080C6", "#FFC20E"],
  ["NFL", "Rams", "Los Angeles", "Rampage", "Puka Nacua", "#003594", "#FFA300"],
  ["NFL", "Dolphins", "Miami", "T.D.", "Tyreek Hill", "#008E97", "#FC4C02"],
  ["NFL", "Vikings", "Minnesota", "Viktor the Viking", "Justin Jefferson", "#4F2683", "#FFC62F"],
  ["NFL", "Patriots", "New England", "Pat Patriot", "Drake Maye", "#002244", "#C60C30"],
  ["NFL", "Saints", "New Orleans", "Gumbo", "Chris Olave", "#D3BC8D", "#101820"],
  ["NFL", "Giants", "New York", null, "Malik Nabers", "#0B2265", "#A71930"],
  ["NFL", "Jets", "New York", null, "Garrett Wilson", "#125740", "#000000"],
  ["NFL", "Eagles", "Philadelphia", "Swoop", "Jalen Hurts", "#004C54", "#A5ACAF"],
  ["NFL", "Steelers", "Pittsburgh", "Steely McBeam", "T.J. Watt", "#FFB612", "#101820"],
  ["NFL", "49ers", "San Francisco", "Sourdough Sam", "Brock Purdy", "#AA0000", "#B3995D"],
  ["NFL", "Seahawks", "Seattle", "Blitz", "Jaxon Smith-Njigba", "#002244", "#69BE28"],
  ["NFL", "Buccaneers", "Tampa Bay", "Captain Fear", "Mike Evans", "#D50A0A", "#34302B"],
  ["NFL", "Titans", "Tennessee", "T-Rac", "Cam Ward", "#0C2340", "#4B92DB"],
  ["NFL", "Commanders", "Washington", "Major Tuddy", "Jayden Daniels", "#5A1414", "#FFB612"],
  // MLB
  ["MLB", "Diamondbacks", "Arizona", "D. Baxter the Bobcat", "Corbin Carroll", "#A71930", "#E3D4AD"],
  ["MLB", "Braves", "Atlanta", "Blooper", "Ronald Acuña Jr.", "#CE1141", "#13274F"],
  ["MLB", "Orioles", "Baltimore", "The Oriole Bird", "Gunnar Henderson", "#DF4601", "#000000"],
  ["MLB", "Red Sox", "Boston", "Wally the Green Monster", "Rafael Devers", "#BD3039", "#0C2340"],
  ["MLB", "Cubs", "Chicago", "Clark the Cub", "Pete Crow-Armstrong", "#0E3386", "#CC3433"],
  ["MLB", "White Sox", "Chicago", "Southpaw", "Luis Robert Jr.", "#27251F", "#C4CED4"],
  ["MLB", "Reds", "Cincinnati", "Mr. Redlegs", "Elly De La Cruz", "#C6011F", "#000000"],
  ["MLB", "Guardians", "Cleveland", "Slider", "José Ramírez", "#00385D", "#E50022"],
  ["MLB", "Rockies", "Colorado", "Dinger", "Ezequiel Tovar", "#333366", "#C4CED4"],
  ["MLB", "Tigers", "Detroit", "Paws", "Tarik Skubal", "#0C2340", "#FA4616"],
  ["MLB", "Astros", "Houston", "Orbit", "Yordan Alvarez", "#002D62", "#EB6E1F"],
  ["MLB", "Royals", "Kansas City", "Sluggerrr", "Bobby Witt Jr.", "#004687", "#BD9B60"],
  ["MLB", "Angels", "Los Angeles", "Rally Monkey", "Mike Trout", "#BA0021", "#003263"],
  ["MLB", "Dodgers", "Los Angeles", null, "Shohei Ohtani", "#005A9C", "#EF3E42"],
  ["MLB", "Marlins", "Miami", "Billy the Marlin", "Sandy Alcantara", "#00A3E0", "#EF3340"],
  ["MLB", "Brewers", "Milwaukee", "Bernie Brewer", "Jackson Chourio", "#12284B", "#FFC52F"],
  ["MLB", "Twins", "Minnesota", "T.C. Bear", "Byron Buxton", "#002B5C", "#D31145"],
  ["MLB", "Mets", "New York", "Mr. Met", "Juan Soto", "#002D72", "#FF5910"],
  ["MLB", "Yankees", "New York", null, "Aaron Judge", "#0C2340", "#C4CED4"],
  ["MLB", "Athletics", "Sacramento", "Stomper", "Lawrence Butler", "#003831", "#EFB21E"],
  ["MLB", "Phillies", "Philadelphia", "Phillie Phanatic", "Bryce Harper", "#E81828", "#002D72"],
  ["MLB", "Pirates", "Pittsburgh", "Pirate Parrot", "Paul Skenes", "#27251F", "#FDB827"],
  ["MLB", "Padres", "San Diego", "Swinging Friar", "Fernando Tatis Jr.", "#2F241D", "#FFC425"],
  ["MLB", "Giants", "San Francisco", "Lou Seal", "Logan Webb", "#FD5A1E", "#27251F"],
  ["MLB", "Mariners", "Seattle", "Mariner Moose", "Julio Rodríguez", "#0C2C56", "#005C5C"],
  ["MLB", "Cardinals", "St. Louis", "Fredbird", "Masyn Winn", "#C41E3A", "#0C2340"],
  ["MLB", "Rays", "Tampa Bay", "Raymond", "Junior Caminero", "#092C5C", "#8FBCE6"],
  ["MLB", "Rangers", "Texas", "Rangers Captain", "Corey Seager", "#003278", "#C0111F"],
  ["MLB", "Blue Jays", "Toronto", "Ace", "Vladimir Guerrero Jr.", "#134A8E", "#E8291C"],
  ["MLB", "Nationals", "Washington", "Screech", "James Wood", "#AB0003", "#14225A"],
  // NHL
  ["NHL", "Ducks", "Anaheim", "Wild Wing", "Leo Carlsson", "#F47A38", "#B9975B"],
  ["NHL", "Bruins", "Boston", "Blades the Bruin", "David Pastrňák", "#FFB81C", "#000000"],
  ["NHL", "Sabres", "Buffalo", "Sabretooth", "Tage Thompson", "#003087", "#FFB81C"],
  ["NHL", "Flames", "Calgary", "Harvey the Hound", "Nazem Kadri", "#D2001C", "#FAAF19"],
  ["NHL", "Hurricanes", "Carolina", "Stormy", "Sebastian Aho", "#CE1126", "#000000"],
  ["NHL", "Blackhawks", "Chicago", "Tommy Hawk", "Connor Bedard", "#CF0A2C", "#000000"],
  ["NHL", "Avalanche", "Colorado", "Bernie the St. Bernard", "Nathan MacKinnon", "#6F263D", "#236192"],
  ["NHL", "Blue Jackets", "Columbus", "Stinger", "Zach Werenski", "#002654", "#CE1126"],
  ["NHL", "Stars", "Dallas", "Victor E. Green", "Jason Robertson", "#006847", "#8F8F8C"],
  ["NHL", "Red Wings", "Detroit", "Al the Octopus", "Dylan Larkin", "#CE1126", "#FFFFFF"],
  ["NHL", "Oilers", "Edmonton", "Hunter the Lynx", "Connor McDavid", "#041E42", "#FF4C00"],
  ["NHL", "Panthers", "Florida", "Stanley C. Panther", "Matthew Tkachuk", "#041E42", "#C8102E"],
  ["NHL", "Kings", "Los Angeles", "Bailey", "Anže Kopitar", "#111111", "#A2AAAD"],
  ["NHL", "Wild", "Minnesota", "Nordy", "Kirill Kaprizov", "#154734", "#A6192E"],
  ["NHL", "Canadiens", "Montreal", "Youppi!", "Nick Suzuki", "#AF1E2D", "#192168"],
  ["NHL", "Predators", "Nashville", "Gnash", "Filip Forsberg", "#FFB81C", "#041E42"],
  ["NHL", "Devils", "New Jersey", "NJ Devil", "Jack Hughes", "#CE1126", "#000000"],
  ["NHL", "Islanders", "New York", "Sparky the Dragon", "Mathew Barzal", "#00539B", "#F47D30"],
  ["NHL", "Rangers", "New York", null, "Artemi Panarin", "#0038A8", "#CE1126"],
  ["NHL", "Senators", "Ottawa", "Spartacat", "Brady Tkachuk", "#DA1A32", "#B79257"],
  ["NHL", "Flyers", "Philadelphia", "Gritty", "Travis Konecny", "#F74902", "#000000"],
  ["NHL", "Penguins", "Pittsburgh", "Iceburgh", "Sidney Crosby", "#000000", "#FCB514"],
  ["NHL", "Sharks", "San Jose", "S.J. Sharkie", "Macklin Celebrini", "#006D75", "#EA7200"],
  ["NHL", "Kraken", "Seattle", "Buoy", "Matty Beniers", "#001628", "#99D9D9"],
  ["NHL", "Blues", "St. Louis", "Louie", "Robert Thomas", "#002F87", "#FCB514"],
  ["NHL", "Lightning", "Tampa Bay", "ThunderBug", "Nikita Kucherov", "#002868", "#FFFFFF"],
  ["NHL", "Maple Leafs", "Toronto", "Carlton the Bear", "Auston Matthews", "#00205B", "#FFFFFF"],
  ["NHL", "Mammoth", "Utah", "Tusk", "Clayton Keller", "#6CACE4", "#010101"],
  ["NHL", "Canucks", "Vancouver", "Fin the Whale", "Quinn Hughes", "#00205B", "#00843D"],
  ["NHL", "Golden Knights", "Vegas", "Chance the Gila Monster", "Jack Eichel", "#B4975A", "#333F42"],
  ["NHL", "Capitals", "Washington", "Slapshot", "Alex Ovechkin", "#C8102E", "#041E42"],
  ["NHL", "Jets", "Winnipeg", "Mick E. Moose", "Kyle Connor", "#041E42", "#004C97"],
  // A few college programs
  ["NCAAB", "Blue Devils", "Duke", "The Blue Devil", "Cooper Flagg", "#003087", "#FFFFFF"],
  ["NCAAB", "Jayhawks", "Kansas", "Big Jay", "Darryn Peterson", "#0051BA", "#E8000D"],
  ["NCAAB", "Huskies", "UConn", "Jonathan the Husky", "Alex Karaban", "#000E2F", "#FFFFFF"],
  ["NCAAB", "Boilermakers", "Purdue", "Purdue Pete", "Braden Smith", "#CEB888", "#000000"],
  ["NCAAB", "Cougars", "Houston", "Shasta", "Milos Uzan", "#C8102E", "#FFFFFF"],
  ["NCAAB", "Wildcats", "Arizona", "Wilbur the Wildcat", "Jaden Bradley", "#CC0033", "#003366"],
  ["NCAAB", "Bulldogs", "Gonzaga", "Spike the Bulldog", "Graham Ike", "#041E42", "#C8102E"],
  ["NCAAB", "Tar Heels", "North Carolina", "Rameses", "Seth Trimble", "#7BAFD4", "#FFFFFF"],
  ["NCAAB", "Volunteers", "Tennessee", "Smokey", "Nate Ament", "#FF8200", "#FFFFFF"],
  ["NCAAB", "Tigers", "Auburn", "Aubie the Tiger", "Tahaad Pettiford", "#0C2340", "#E87722"],
  ["NCAAF", "Bulldogs", "Georgia", "Hairy Dawg", "Gunner Stockton", "#BA0C2F", "#000000"],
  ["NCAAF", "Buckeyes", "Ohio State", "Brutus Buckeye", "Jeremiah Smith", "#BB0000", "#666666"],
  ["NCAAF", "Longhorns", "Texas", "Bevo", "Arch Manning", "#BF5700", "#FFFFFF"],
  ["NCAAF", "Ducks", "Oregon", "The Oregon Duck", "Dante Moore", "#154733", "#FEE123"],
  ["NCAAF", "Crimson Tide", "Alabama", "Big Al", "Ryan Williams", "#9E1B32", "#828A8F"],
  ["NCAAF", "Wolverines", "Michigan", null, "Bryce Underwood", "#00274C", "#FFCB05"],
  ["NCAAF", "Nittany Lions", "Penn State", "Nittany Lion", "Drew Allar", "#041E42", "#FFFFFF"],
  ["NCAAF", "Fighting Irish", "Notre Dame", "The Leprechaun", "Jeremiyah Love", "#0C2340", "#C99700"],
  ["NCAAF", "Rebels", "Ole Miss", "Tony the Landshark", "Austin Simmons", "#CE1126", "#14213D"],
  ["NCAAF", "Tigers", "LSU", "Mike the Tiger", "Garrett Nussmeier", "#461D7C", "#FDD023"],
];

export interface TeamRecord { sport: SportKey; nickname: string; city: string; mascot: string | null; star: string; colors: [string, string] }

const TEAMS: TeamRecord[] = ROWS.map(([sport, nickname, city, mascot, star, c1, c2]) => ({ sport, nickname, city, mascot, star, colors: [c1, c2] }));

export function findTeam(sport: SportKey, name: string): TeamRecord | null {
  const n = name.trim().toLowerCase();
  const pool = TEAMS.filter((t) => t.sport === sport);
  return (
    pool.find((t) => t.nickname.toLowerCase() === n) ??
    pool.find((t) => `${t.city} ${t.nickname}`.toLowerCase() === n) ??
    pool.find((t) => n.endsWith(t.nickname.toLowerCase())) ??
    pool.find((t) => t.city.toLowerCase() === n) ??
    TEAMS.find((t) => t.nickname.toLowerCase() === n) ??
    null
  );
}

const SPORT_NOUN: Record<SportKey, string> = { NBA: "basketball", NFL: "football", MLB: "baseball", NHL: "hockey", NCAAB: "college basketball", NCAAF: "college football", OTHER: "sports" };

export type SubjectPolicy = "mascot_first" | "athlete_first" | "mascot_only";

export interface SubjectInput { sport: SportKey; betType: string; selection: string; awayTeam: string; homeTeam: string }

/** Which team is the pick actually backing? Falls back to the home team. */
export function backedTeam(input: SubjectInput): { name: string; team: TeamRecord | null } {
  const sel = input.selection.toLowerCase();
  for (const name of [input.homeTeam, input.awayTeam]) {
    const t = findTeam(input.sport, name);
    const nick = (t?.nickname ?? name).toLowerCase();
    if (sel.includes(nick) || sel.includes(name.toLowerCase())) return { name, team: t };
  }
  return { name: input.homeTeam, team: findTeam(input.sport, input.homeTeam) };
}

/** Parse "T. Haliburton Over 8.5 Assists" → "T. Haliburton". */
export function athleteFromSelection(selection: string): string | null {
  const m = selection.match(/^([A-Z][\w.'-]*(?:\s+[A-Z][\w.'-]*){0,3})\s+(Over|Under|O|U)\b/);
  return m ? m[1].trim() : null;
}

export function resolveFromLibrary(input: SubjectInput, policy: SubjectPolicy, likenessAllowed: boolean): HypeSubject {
  const { name, team } = backedTeam(input);
  const sport = input.sport;
  const noun = SPORT_NOUN[sport];
  const colors: [string, string] = team?.colors ?? ["#8DFF32", "#080D0A"];
  const teamLabel = team ? `${team.city} ${team.nickname}` : name;
  const nick = team?.nickname ?? name;

  const propAthlete = input.betType === "player_prop" ? athleteFromSelection(input.selection) : null;
  const athlete = propAthlete ?? team?.star ?? null;
  const mascot = team?.mascot ?? null;

  const athleteDescriptor = (who: string) =>
    likenessAllowed
      ? `${who}, star ${noun} player of the ${teamLabel}, in the team's ${nick} uniform`
      : `a stylized, non-photorealistic cartoon ${noun} superstar in a ${nick}-style uniform (no real person's face), ${colors[0]} and ${colors[1]} team colors`;
  const mascotDescriptor = (who: string) => `${who}, the official ${teamLabel} mascot, as a bold stylized 3D cartoon character, ${colors[0]} and ${colors[1]} team colors`;

  const useMascot = (policy === "mascot_only" || policy === "mascot_first") && mascot && !propAthlete;
  if (useMascot && mascot) return { kind: "mascot", name: mascot, team: teamLabel, teamNickname: nick, sport, descriptor: mascotDescriptor(mascot), colors, source: "library", likenessAllowed };
  if (athlete && policy !== "mascot_only") return { kind: "athlete", name: athlete, team: teamLabel, teamNickname: nick, sport, descriptor: athleteDescriptor(athlete), colors, source: "library", likenessAllowed };
  if (mascot) return { kind: "mascot", name: mascot, team: teamLabel, teamNickname: nick, sport, descriptor: mascotDescriptor(mascot), colors, source: "library", likenessAllowed };
  return {
    kind: "generic",
    name: `${nick} superfan`,
    team: teamLabel,
    teamNickname: nick,
    sport,
    descriptor: `an over-the-top cartoon ${nick} superfan in full ${colors[0]} and ${colors[1]} face paint and gear, ${noun} arena energy`,
    colors,
    source: "fallback",
    likenessAllowed,
  };
}

export function teamCount() {
  return TEAMS.length;
}
