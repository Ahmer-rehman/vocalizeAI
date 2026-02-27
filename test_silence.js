const { spawn } = require("child_process");

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { ...opts });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => {
      resolve({ code, stdout, stderr }); // ignoring reject for test
    });
  });
}

async function test() {
   // Let's create a dummy 60s file with random silence
   await run("ffmpeg", ["-y", "-f", "lavfi", "-i", "anoisesrc=d=60", "dummy.wav"]);
   const res = await run("ffmpeg", ["-i", "dummy.wav", "-af", "silencedetect=noise=-30dB:d=0.5", "-f", "null", "-"]);
   console.log(res.stderr);
}
test();
