// import { openDB } from "idb";
//
// const DB_NAME = "EllixDB";
// const STORE_NAME = "Ellix";
//
// export async function getDb() {
//   return openDB(DB_NAME, 1, {
//     upgrade(db) {
//       if (!db.objectStoreNames.contains(STORE_NAME)) {
//         db.createObjectStore(STORE_NAME, {
//           keyPath: "id",
//           autoIncrement: true,
//         });
//       }
//     },
//   });
// }
//
// export async function setHomeSliderPosts(data: IPost[]) {
//   const db = await getDb();
//   await db.put(STORE_NAME, data);
// }
//
// export async function getHomeSliderPosts() {
//   const db = await getDb();
//   return db.getAll(STORE_NAME);
// }
