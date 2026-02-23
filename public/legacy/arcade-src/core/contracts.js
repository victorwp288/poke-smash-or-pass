/**
 * @typedef {Object} GameSnapshot
 * @property {string} [updatedAt]
 * @property {Record<string, any>} [data]
 */

/**
 * @typedef {Object} GameContext
 * @property {import('./pokemon-repo.js').PokemonRepo} repo
 * @property {import('./storage.js').StorageApi} storage
 * @property {import('./app-shell.js').UiShellApi} shell
 * @property {{ play: (src: string) => Promise<void>, stop: () => void }} audio
 * @property {{ random: () => number, seed: (seed: number) => () => number }} rng
 * @property {(eventName: string, payload?: object) => void} track
 */

/**
 * @typedef {Object} GameModule
 * @property {string} id
 * @property {string} title
 * @property {string} category
 * @property {string[]} [styles]
 * @property {(ctx: GameContext) => Promise<void>|void} [init]
 * @property {(ctx: GameContext) => Promise<void>|void} [mount]
 * @property {(ctx: GameContext) => Promise<void>|void} [unmount]
 * @property {() => GameSnapshot} [getSnapshot]
 * @property {(snapshot: GameSnapshot | null | undefined) => void} [restoreSnapshot]
 */

export {};
