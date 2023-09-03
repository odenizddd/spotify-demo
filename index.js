const express = require('express');
const app = express();
require('dotenv').config();
const axios = require('axios');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8080;
const getAccessToken = require('./token');

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use("/callback", express.static('dist'));
app.use(express.static('dist'));

app.get("/search/:query", async (req, res) => {
    console.log("Received a SEARCH request.");
    try {
        const response = await axios.request({
            method: "GET",
                url: `https://api.spotify.com/v1/search?q=${encodeURI(req.params.query)}&type=track`,
                headers: {
                    "Authorization": `Bearer ${await getAccessToken()}`
                }
        });
        const extractedData = response.data.tracks.items.map(item => {
            return {
                track_id: item.id,
                title: item.name,
                artist_id: item.artists[0].id,
                artist: item.artists[0].name,
                cover_url: item.album.images[0].url,
                preview_url: item.preview_url
            }
        }).filter(item => {return item.preview_url !== null});
        //res.header({"Access-Control-Allow-Origin": "*"});
        res.send(extractedData);
    }catch (err) {
        console.log(err);
        res.status(404).send("Search error.");
    }
});

//encoding should be done by the client
app.get("/discover", async (req, res) => {
    try {
        const response = await axios.request({
            method: "GET",
                url: `https://api.spotify.com/v1/recommendations?${new URLSearchParams(req.query).toString()}`,
                headers: {
                    "Authorization": `Bearer ${await getAccessToken()}`
                }
        });
        const extractedData = response.data.tracks.map(item => {
            return {
                track_id: item.id,
                title: item.name,
                artist_id: item.artists[0].id,
                artist: item.artists[0].name,
                cover_url: item.album.images[0].url,
                preview_url: item.preview_url
            }
        }).filter(item => {return item.preview_url !== null});
        //res.header({"Access-Control-Allow-Origin": "*"});
        res.send(extractedData);
    }catch (err) {
        console.log(err);
        res.status(404).send("Discover error.");
    }
});

app.get('/login', function(req, res) {

  console.log("Login request...");
  var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';

  res.redirect('https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.REDIRECT_URI
    }).toString());
});

app.post('/export', async (req, res) => {
    console.log("Export request...");
    console.log(req.body.code);
    console.log(req.body.name);
    console.log(req.body.description);
    console.log(req.body.tracks);
    let playlist_id = null;
    console.log(req.body.tracks.map(track_id => {
        return `spotify:track:${track_id}`
    }));

    //Fetch an access token using the code.
    try {
        let response = await axios.request({
            method: "POST",
            url: "https://accounts.spotify.com/api/token",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
            },
            data: new URLSearchParams({
                grant_type: "authorization_code",
                code: req.body.code,
                redirect_uri: process.env.REDIRECT_URI
            }).toString()
        });
        const accessToken = response.data.access_token;
        response = await axios.request({
            method: "GET",
            url: "https://api.spotify.com/v1/me",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });
        const user_id = response.data.id;
        const name = req.body.name;
        const description = req.body.description;
        response = await axios.request({
            method: "POST",
            //TODO: Get current username by making a call to /me endpoint
            //Right now your own username is hardcoded.
            url: `https://api.spotify.com/v1/users/${user_id}/playlists`,
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            data: JSON.stringify({
                name: name,
                description: description
            })
        });
        console.log(response.data.id);
        playlist_id = response.data.id;
        response = await axios.request({
            method: "POST",
            url: `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`,
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            data: JSON.stringify({
                uris: req.body.tracks.map(track_id => {
                    return `spotify:track:${track_id}`
                })
            })
        });
    }catch (err) {
        console.log(err);
    }
    res.send({
        playlist_id: playlist_id
    });
});

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});