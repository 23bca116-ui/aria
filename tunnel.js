const { exec } = require('child_process');

const SUBDOMAIN = 'aria-final-demo';
const PORT = 8000;
let retries = 0;

function startTunnel() {
    console.log(`[Tunnel] Starting localtunnel on port ${PORT} with subdomain ${SUBDOMAIN}...`);
    
    const child = exec(`npx localtunnel --port ${PORT} --subdomain ${SUBDOMAIN}`, (err) => {
        if (err) {
            retries++;
            const delay = Math.min(retries * 2000, 10000);
            console.log(`[Tunnel] Crashed (attempt ${retries}). Restarting in ${delay/1000}s...`);
            setTimeout(startTunnel, delay);
        }
    });

    child.stdout.on('data', (data) => {
        const output = data.toString().trim();
        console.log(`[Tunnel] ${output}`);
        if (output.includes('your url is:')) {
            retries = 0; // Reset on successful connection
        }
    });

    child.stderr.on('data', (data) => {
        console.error(`[Tunnel Error] ${data.toString().trim()}`);
    });

    child.on('exit', (code) => {
        if (code !== 0) {
            retries++;
            const delay = Math.min(retries * 2000, 10000);
            console.log(`[Tunnel] Exited with code ${code}. Restarting in ${delay/1000}s...`);
            setTimeout(startTunnel, delay);
        }
    });
}

startTunnel();
