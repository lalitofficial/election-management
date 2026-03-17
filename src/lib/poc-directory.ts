import { prisma } from "@/lib/prisma";

export type PocTag = "LEAD" | "GREEN" | "ORANGE";

export type PocContact = {
  hostel: string;
  wing: string;
  name: string;
  rollNo: string;
  phoneNo: string;
  tags: PocTag[];
};

export type PocDirectoryRow = {
  hostel: string;
  wing: string;
  contacts: PocContact[];
};

type PocSeedTuple = [string, string, string, string, string, PocTag[]];

const cauveryPocSeed: PocSeedTuple[] = [
  ["Cauvery", "101-112", "Om Atul Dhomne", "CH24B017", "", ["GREEN"]],
  ["Cauvery", "101-112", "Sarvesh Vijay Nikam", "ME24B156", "9765996065", ["LEAD"]],
  ["Cauvery", "101-112", "Siddh Sanjay Rathod", "ME24B160", "", ["ORANGE"]],
  ["Cauvery", "101-112", "Sinchan Mukherjee", "ME24B162", "", ["ORANGE"]],
  ["Cauvery", "101-112", "Tejas Gupta", "ME24B173", "", ["ORANGE"]],
  ["Cauvery", "101-112", "Vardaan Srivastava", "ME24B175", "", ["ORANGE"]],
  ["Cauvery", "1020-1033", "Alfie Joshua Paul", "CH24B032", "6383953512", ["LEAD"]],
  ["Cauvery", "1034-1045", "Arnav Kumar", "MD24B003", "", ["GREEN"]],
  ["Cauvery", "1034-1045", "Devesh Bhargava", "MD24B008", "", ["GREEN"]],
  ["Cauvery", "1034-1045", "Divyansh Aggarwal", "EE24B101", "8851098799", ["GREEN", "LEAD"]],
  ["Cauvery", "1034-1045", "Sudeep", "MD24B028", "", ["GREEN"]],
  ["Cauvery", "1046-1057", "Jadav Het Jayendrabhai", "CE24B070", "", ["GREEN"]],
  ["Cauvery", "1046-1057", "Nishant Kumar Meena", "EP24B036", "8595886603", ["GREEN", "LEAD"]],
  ["Cauvery", "113-124", "Darsh Balia", "BE24B025", "", ["GREEN"]],
  ["Cauvery", "113-124", "Gugulothu Charan", "ME24B020", "", ["ORANGE"]],
  ["Cauvery", "113-124", "Tambe Arnav Rajesh", "ME24B067", "", ["ORANGE"]],
  ["Cauvery", "125-136", "Himanshu Gupta", "ME24B109", "", ["GREEN"]],
  ["Cauvery", "125-136", "P Kishor", "ME24B120", "", ["ORANGE"]],
  ["Cauvery", "125-136", "Sanjay Ram Soundararajan", "BE24B013", "8072414003", ["LEAD"]],
  ["Cauvery", "137-148", "Vislavath Sunil", "CE24B032", "9550368215", ["LEAD"]],
  ["Cauvery", "149-159", "Ipsit Prasad Sahu", "CE24B011", "", ["GREEN"]],
  ["Cauvery", "149-159", "Pradeep Meena", "CE24B099", "", ["GREEN"]],
  ["Cauvery", "149-159", "Prashant Kumar", "CE24B100", "9536366488", ["LEAD"]],
  ["Cauvery", "161-172", "Rythem Mehul Shah", "ME24B056", "", ["GREEN"]],
  ["Cauvery", "161-172", "Shriansh Krishna Dasi", "ME24B014", "9100382481", ["GREEN", "LEAD"]],
  ["Cauvery", "2001-2007", "Aerram Sai Puneth", "CE24B039", "9030300170", ["LEAD"]],
  ["Cauvery", "2008-2019", "Nithin G", "EE24B046", "8778269690", ["GREEN", "LEAD"]],
  ["Cauvery", "201-212", "Ameen Muhammed Shakkib", "EE24B087", "8281082197", ["LEAD"]],
  ["Cauvery", "201-212", "Kiran Augustine", "ME24B121", "", ["GREEN"]],
  ["Cauvery", "201-212", "Madhav Pradeep", "ME24B038", "", ["GREEN"]],
  ["Cauvery", "201-212", "Nizamuddin", "CE24B094", "", ["GREEN"]],
  ["Cauvery", "2020-2033", "Om Butani", "EE24B132", "", ["GREEN"]],
  ["Cauvery", "2020-2033", "Rishit Khandelwal", "ME24B054", "7718833005", ["GREEN", "LEAD"]],
  ["Cauvery", "2020-2033", "Yash Chetan Jain", "EE24B156", "", ["GREEN"]],
  ["Cauvery", "2034-2045", "Dev Upadhyaya", "EE24B015", "9483853000", ["GREEN", "LEAD"]],
  ["Cauvery", "2046-2057", "Mohnish Ramesh", "EE24B041", "9444715541", ["LEAD"]],
  ["Cauvery", "213-224", "Aryan Kala", "BE24B004", "7339945323", ["GREEN", "LEAD"]],
  ["Cauvery", "213-224", "Hitesh Singh", "BS24B001", "", ["GREEN"]],
  ["Cauvery", "213-224", "Sumit Kumar", "BE24B040", "", ["GREEN"]],
  ["Cauvery", "213-224", "Vaibhav Mishra", "BE24B042", "", ["GREEN"]],
  ["Cauvery", "225-236", "Hariccharan M", "EP24B009", "", ["GREEN"]],
  ["Cauvery", "225-236", "Maradana Sai Srikar", "CH24B012", "9182268104", ["LEAD"]],
  ["Cauvery", "237-248", "Aditya Gautam", "CE24B001", "", ["GREEN"]],
  ["Cauvery", "237-248", "Ajeya P", "CH24B028", "", ["GREEN"]],
  ["Cauvery", "237-248", "Alamkonda Aashish Kumar", "CE24B003", "", ["GREEN"]],
  ["Cauvery", "237-248", "Anikait Kundu", "ME24B083", "", ["GREEN"]],
  ["Cauvery", "237-248", "Arihan Babu Kamal Saroj", "ME24B086", "", ["GREEN"]],
  ["Cauvery", "237-248", "Darsheel Sharma", "CH24B052", "", ["GREEN"]],
  ["Cauvery", "237-248", "Divyansh Jeengar", "CH24B055", "", ["GREEN"]],
  ["Cauvery", "237-248", "Eklavya Gade", "ME24B101", "", ["GREEN"]],
  ["Cauvery", "237-248", "Gore Pranav Parmeshwar", "ME24B106", "", ["GREEN"]],
  ["Cauvery", "237-248", "Hridik Sunil Gaikwad", "ME24B110", "", ["GREEN"]],
  ["Cauvery", "237-248", "Ishaan Karwa", "ME24B112", "", ["GREEN"]],
  ["Cauvery", "237-248", "Kulkarni Om Rahul", "ME24B123", "", ["GREEN"]],
  ["Cauvery", "237-248", "Lalit Kumar", "ME24B124", "9398522151", ["GREEN", "LEAD"]],
  ["Cauvery", "237-248", "Rishav Kumar", "CE24B102", "", ["GREEN"]],
  ["Cauvery", "237-248", "Sai Ashish Mishra", "CE24B103", "", ["GREEN"]],
  ["Cauvery", "237-248", "Shambhuraj Mahesh Salunkhe", "CE24B114", "", ["GREEN"]],
  ["Cauvery", "237-248", "Shreyash Patole", "CE24B115", "", ["GREEN"]],
  ["Cauvery", "237-248", "Shubham Mahesh Bansal", "CE24B116", "", ["GREEN"]],
  ["Cauvery", "237-248", "Shubhang Agarwal", "CE24B117", "", ["GREEN"]],
  ["Cauvery", "237-248", "Tirumala Aditya", "CE24B123", "", ["GREEN"]],
  ["Cauvery", "237-248", "Venkata Sai Teja Madineni", "DA24B031", "", ["GREEN"]],
  ["Cauvery", "237-248", "Vir Jain", "CE24B126", "", ["GREEN"]],
  ["Cauvery", "237-248", "Waghmare Rajvardhan Chandan", "CE24B127", "", ["GREEN"]],
  ["Cauvery", "237-248", "Yashas Katyal", "CE24B128", "", ["GREEN"]],
  ["Cauvery", "249-259", "Animesh Pandey", "CH24B081", "7506063968", ["GREEN", "LEAD"]],
  ["Cauvery", "249-259", "Mayank Singh", "CH24B068", "", ["GREEN"]],
  ["Cauvery", "249-259", "Nitin Kumar", "CH24B077", "", ["GREEN"]],
  ["Cauvery", "261-272", "Balendu Shekhar Ojha", "EE24B009", "", ["GREEN"]],
  ["Cauvery", "261-272", "Daksh Gautam", "EE24B099", "", ["GREEN"]],
  ["Cauvery", "261-272", "Puneet Swami", "EE24B137", "", ["GREEN"]],
  ["Cauvery", "261-272", "Rahul Roy", "EE24B054", "9174471745", ["GREEN", "LEAD"]],
  ["Cauvery", "261-272", "Virendra Mandavaria", "EE24B153", "", ["GREEN"]],
  ["Cauvery", "3001-3007", "Sabavat Rahul", "BS24B031", "9705851518", ["LEAD"]],
  ["Cauvery", "3008-3019", "Rishik Kodityala", "ED24B014", "9391229057", ["LEAD"]],
  ["Cauvery", "301-312", "Pradhyumna S", "EE24B135", "9632782010", ["GREEN", "LEAD"]],
  ["Cauvery", "3020-3033", "Aryan Jain", "CH24B040", "", ["GREEN"]],
  ["Cauvery", "3020-3033", "Garvit Pahwa", "CE24B064", "", ["GREEN"]],
  ["Cauvery", "3020-3033", "Param Rakesh Shah", "CE24B097", "9820965655", ["GREEN", "LEAD"]],
  ["Cauvery", "3034-3045", "Karoor Sardar Vali", "ME24B118", "", ["ORANGE"]],
  ["Cauvery", "3034-3045", "Maddur Lohit", "ME24B127", "", ["ORANGE"]],
  ["Cauvery", "3034-3045", "Madhali Yagendra V Charan", "ME24B128", "6305724178", ["LEAD"]],
  ["Cauvery", "3034-3045", "Samarth Sneh", "CH24B093", "", ["GREEN"]],
  ["Cauvery", "3046-3057", "Apoorv Shah", "BS24B006", "", ["GREEN"]],
  ["Cauvery", "3046-3057", "Arsh Mathur", "EP24B024", "", ["GREEN"]],
  ["Cauvery", "3046-3057", "Magizhan Natarajan", "ED24B060", "9894217603", ["LEAD"]],
  ["Cauvery", "313-324", "Peddagolla Mahanthi", "AE24B018", "9346192205", ["LEAD"]],
  ["Cauvery", "325-336", "Sriram Venkata Krishna", "EE24B067", "7989575845", ["GREEN", "LEAD"]],
  ["Cauvery", "337-348", "Om Bora", "ED24B019", "8805381380", ["GREEN", "LEAD"]],
  ["Cauvery", "337-348", "Prabhav Gupta", "DA24B018", "", ["GREEN"]],
  ["Cauvery", "349-360", "Ayush Kanojiya", "DA24B037", "", ["GREEN"]],
  ["Cauvery", "349-360", "Dipayan Dasgupta", "CE24B059", "", ["GREEN"]],
  ["Cauvery", "349-360", "Sujal Jayant Kumar", "DA24B026", "9930386223", ["LEAD"]],
  ["Cauvery", "361-372", "Chillamcherla Purna Krishna Vamsi", "EE24B014", "9110355350", ["LEAD"]],
  ["Cauvery", "361-372", "V Sanjesh", "AE24B051", "", ["GREEN"]],
];

const tagPriority: Record<PocTag, number> = {
  LEAD: 0,
  GREEN: 1,
  ORANGE: 2,
};

function compareTags(left: PocTag[], right: PocTag[]) {
  const leftRank = Math.min(...left.map((tag) => tagPriority[tag]));
  const rightRank = Math.min(...right.map((tag) => tagPriority[tag]));
  return leftRank - rightRank;
}

function compareWing(left: string, right: string) {
  return left.localeCompare(right, undefined, { numeric: true });
}

async function getMissingPhoneMap(contacts: PocContact[]) {
  const missingRollNos = [...new Set(
    contacts
      .filter((contact) => !contact.phoneNo && contact.rollNo)
      .map((contact) => contact.rollNo),
  )];

  if (missingRollNos.length === 0) {
    return new Map<string, string>();
  }

  const students = await prisma.student.findMany({
    where: {
      rollNo: {
        in: missingRollNos,
      },
    },
    select: {
      rollNo: true,
      phoneNo: true,
    },
  });

  return new Map(
    students.map((student) => [
      student.rollNo,
      student.phoneNo.trim() || "Not available",
    ]),
  );
}

let _cache: { result: PocDirectoryRow[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 10 * 60_000; // 10 minutes

export function invalidatePocDirectoryCache() {
  _cache = null;
}

export async function getPocDirectory(): Promise<PocDirectoryRow[]> {
  const now = Date.now();
  if (_cache && now < _cache.expiresAt) {
    return _cache.result;
  }
  const baseContacts: PocContact[] = cauveryPocSeed.map(
    ([hostel, wing, name, rollNo, phoneNo, tags]) => ({
      hostel,
      wing,
      name,
      rollNo,
      phoneNo,
      tags,
    }),
  );

  const missingPhoneMap = await getMissingPhoneMap(baseContacts);
  const resolvedContacts = baseContacts.map((contact) => ({
    ...contact,
    phoneNo: contact.phoneNo || missingPhoneMap.get(contact.rollNo) || "Not available",
    tags: [...contact.tags].sort((left, right) => tagPriority[left] - tagPriority[right]),
  }));

  const grouped = new Map<string, PocDirectoryRow>();

  for (const contact of resolvedContacts) {
    const key = `${contact.hostel}|${contact.wing}`;
    const current = grouped.get(key) ?? {
      hostel: contact.hostel,
      wing: contact.wing,
      contacts: [],
    };
    current.contacts.push(contact);
    grouped.set(key, current);
  }

  const result = [...grouped.values()]
    .map((row) => ({
      ...row,
      contacts: row.contacts.sort(
        (left, right) =>
          compareTags(left.tags, right.tags) ||
          left.name.localeCompare(right.name, undefined, { numeric: true }),
      ),
    }))
    .sort(
      (left, right) =>
        left.hostel.localeCompare(right.hostel) || compareWing(left.wing, right.wing),
    );

  _cache = { result, expiresAt: Date.now() + CACHE_TTL_MS };
  return result;
}

export function buildPocLookup(directory: PocDirectoryRow[]) {
  return new Map(
    directory.map((row) => [`${row.hostel}|${row.wing}`, row.contacts] as const),
  );
}
