import React from "react";

export const readJson = <T>(key: string, fallback: T): T => {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = <T>(key: string, value: T) => {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/private mode errors
  }
};

export const useLocalStorageState = <T>(
  key: string,
  initialValue: T,
  options: {
    parse?: (value: unknown) => T;
    serialize?: (value: T) => unknown;
  } = {}
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const parse = options.parse;
  const serialize = options.serialize;

  const [state, setState] = React.useState<T>(() => {
    const raw = readJson<unknown>(key, initialValue as unknown);
    return parse ? parse(raw) : (raw as T);
  });

  React.useEffect(() => {
    writeJson(key, serialize ? (serialize(state) as any) : state);
  }, [key, serialize, state]);

  React.useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      if (event.key !== key) return;
      const raw = readJson<unknown>(key, initialValue as unknown);
      setState(parse ? parse(raw) : (raw as T));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key, initialValue, parse]);

  return [state, setState];
};
