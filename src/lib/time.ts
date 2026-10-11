export const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3600_000);
