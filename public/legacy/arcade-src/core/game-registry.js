export class GameRegistry {
  constructor(flags = {}) {
    this.flags = flags;
    this.records = new Map();
  }

  registerGame(record) {
    if (!record?.id) {
      throw new Error("Game record requires an id");
    }
    this.records.set(record.id, record);
  }

  getGame(id) {
    return this.records.get(id) || null;
  }

  listGames(options = {}) {
    const { visibleOnly = true } = options;
    const games = Array.from(this.records.values());
    if (!visibleOnly) return games;
    return games.filter((record) => {
      const flag = this.flags[record.id];
      if (!flag) return true;
      return flag.visible !== false;
    });
  }
}
