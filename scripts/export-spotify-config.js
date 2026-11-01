const fs = require('node:fs');
const path = require('node:path');

function exportSpotifyConfig(output, root = path.join(__dirname, '..'), env = process.env) {
  const local = {};
  const dotenv = path.join(root, '.env');
  if (fs.existsSync(dotenv)) {
    for (const line of fs.readFileSync(dotenv, 'utf8').split(/\r?\n/)) {
      const match = line.trim().match(/^(SPOTIFY_CLIENT_ID|UNIQUE_SPOTIFY_CLIENT_ID)\s*=\s*(.*)$/);
      if (match) local[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2').trim();
    }
  }
  // Spotify's public application ID ships with the app; the client secret never does.
  const clientId = String(env.SPOTIFY_CLIENT_ID || local.SPOTIFY_CLIENT_ID || env.UNIQUE_SPOTIFY_CLIENT_ID || local.UNIQUE_SPOTIFY_CLIENT_ID || '').trim();
  if (clientId && !/^[a-f\d]{32}$/i.test(clientId)) throw new Error('SPOTIFY_CLIENT_ID must be a 32-character application ID.');
  fs.writeFileSync(path.join(output, 'spotify-client.json'), JSON.stringify({ clientId }) + '\n', 'utf8');
}

if (require.main === module) exportSpotifyConfig(path.resolve(process.argv[2] || 'dist/rust'));
module.exports = { exportSpotifyConfig };
