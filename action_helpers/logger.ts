/**
 * Add a timestamped log to the test output.
 */
export function log(text: string) {
  const enabled = process.env['ENABLE_LOGS'] === '1' || process.env['ENABLE_LOGS'] === 'true';
  if (enabled) {
    const d = new Date();
    const pad = (num: number) => {
      return (`0${num}`).slice(-2);
    };
    const time =
        `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
    console.log(`${time} ${text}`);
  }
}
