// The one program of the image (§17.4): one binary, one copy of the runtime.
//
//   pamoja             serves the app
//   pamoja seed --prod rebuilds the demo data, the server stopped (§18.1)
//
// Imported on demand: the seed must clear the database before the server
// would open it.
if (Deno.args[0] === 'seed') await import('../task-db-seed.ts')
else await import('../prod-server.ts')
