export const seededRng = (seed: number) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 48271) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

export const dateSeed = () => {
  const now = new Date();
  return Number(
    `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}${String(now.getUTCDate()).padStart(2, "0")}`
  );
};
