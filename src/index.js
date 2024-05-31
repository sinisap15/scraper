(async () => {
  console.log("Starting app");
  console.log("Shutting down!");
})().catch(error => {
  logger.error("Initialization error", error);
  process.exit(1);
});
