// Pattern 1 & 4
const { PORT, LOCAL_OVERRIDE } = process.env;
console.log(process.env.DATABASE_URL);

// MISSING var
console.log(process.env.MISSING_TOKEN);

// TYPO candidate: POX or PORTT -> distance <= 2 to PORT or POT
console.log(process.env.PORTT);
