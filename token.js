const fs = require('fs');
const axios = require('axios');

/* Return a valid access token either from the log file
or by making a request to the Spotify API */
module.exports = async () => {
    const logFile = "log.txt";
    //Fetch a new access token
    //TODO: Handle bad responses and errors
    const fetchAccessToken = async () => {
        console.log("Fetching new access token...")
        const res = await axios.request({
            method: "POST",
            url: "https://accounts.spotify.com/api/token",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: {
                grant_type: "client_credentials",
                client_id: process.env.SPOTIFY_CLIENT_ID,
                client_secret: process.env.SPOTIFY_CLIENT_SECRET
            }
        });
        const accessToken = res.data.access_token;
        fs.writeFileSync(logFile, JSON.stringify({
            lastDate: new Date(),
            accessToken: accessToken
        }));
        return accessToken;
    }; 

    //Check if there is a an available access token in the log file.
    //If there is not fetch a new token and return it.
    const token = fs.existsSync(logFile)
            && (content = fs.readFileSync(logFile, "utf8"))
            && (obj=JSON.parse(content))
            && ((new Date().getTime() - new Date(obj.lastDate).getTime())/1000 < 3600)
            && obj.accessToken;
    return (token && console.log("Found valid token..."), token) || await fetchAccessToken();
}