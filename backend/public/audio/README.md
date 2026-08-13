# Add preprogrammed phrase audio files here.

Each file should be named to match the `audioUrl` field in
`backend/src/data/phrases.ts`, for example:

- ohayou-gozaimasu.mp3
- genki-desu-ka.mp3
- onaka-ga-suita.mp3
- nani-ga-tabetai.mp3
- eki-wa-doko-desu-ka.mp3
- otsukaresama-desu.mp3

Until real audio is added, the frontend will show a friendly error
if playback is attempted on a missing file.
