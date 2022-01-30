const express = require('express');
const qs = require('querystring');
const axios = require('axios');

const port = 8888;
//var ACCESS_TOKEN = "BQDk-b8r8FZvjjNxUEtOyws5O3FzMVORMg1GVPfEIOLZzbfvwvhCLo8l2WWWfYZ96Hdn7LZSMJq3ldtmzJI_e9hlNO5tF2rCP_yJOmFJ-aoZH0b-mvDHMk8bG9jyppyj-2Mu0Aa1hkEwOBXXjgTfW4s4_Q";
ACCESS_TOKEN = '';

var client_id = '850d1647e0524185934a75a886c5bc1e';
var redirect_uri = 'http://192.168.1.16:8888/callback';

var app = express();

var tempo = 0;
var color = [0, 0, 0];

const CHROMA_COLOR = [
    [229, 76, 78],
    [223, 132, 74],
    [228, 171, 81],
    [227, 199, 73],
    [223, 228, 78],
    [174, 215, 71],
    [63, 188, 70],
    [63, 169, 180],
    [64, 124, 180],
    [78, 69, 179],
    [141, 69, 183],
    [202, 69, 147]
];

app.get('/login', function (req, res) {

    var state = "abcdefghijklmnop"
    var scope = 'user-read-playback-state';

    res.redirect('https://accounts.spotify.com/authorize?' +
        qs.stringify({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        }));
});

app.get('/callback', (req, res) => {
    var data = qs.stringify({
        'grant_type': 'authorization_code',
        'code': req.query["code"],
        'redirect_uri': redirect_uri
    });
    var config = {
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ODUwZDE2NDdlMDUyNDE4NTkzNGE3NWE4ODZjNWJjMWU6OTQ4ODQxOTRlYWM2NDc0ZmE1NWU3MWNiNWI5NTJhMDU=',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: data
    };

    axios(config)
        .then(function (response) {
            let data = response.data;
            ACCESS_TOKEN = data["access_token"];
            console.log(data);
        })
        .catch(function (error) {
            console.log(error);
        });

    res.status(200);
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`)
});

app.get('/tempo', (req, res) => {
    res.send(tempo + " " + Math.round(color[0]) + " " + Math.round(color[1]) + " " + Math.round(color[2])).status(200);
    res.end();
});

async function audio_analysis(id) {
    var config = {
        method: 'get',
        url: 'https://api.spotify.com/v1/audio-analysis/' + id,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ACCESS_TOKEN,
        }
    };

    let rsp = await axios(config);
    return rsp.data;
}

// song_obj: Json of song in relation to timestamp
// time_since_start in ms
function current_tempo(song_obj, time_since_start) {
    let sections = song_obj['sections'];
    for (let i = sections.length - 1; i >= 0; i--) {
        if (time_since_start / 1000 >= sections[i]['start']) {
            return sections[i]['tempo'];
        }
    }
}

function current_pitches(song_obj, time_since_start) {
    let ret = [0, 0, 0];
    let sections = song_obj['segments'];
    for (let i = sections.length - 1; i >= 0; i--) {
        if (time_since_start / 1000 >= sections[i]['start']) {
            let pitches = sections[i]['pitches'];
            for (let j = 0; j < pitches.length; j++) {
                let scale = pitches[j];

                if (scale === 1)
                    return CHROMA_COLOR[j];

                ret[0] += scale * CHROMA_COLOR[j][0];
                ret[1] += scale * CHROMA_COLOR[j][1];
                ret[2] += scale * CHROMA_COLOR[j][2];

            }

            ret[0] /= pitches.length;
            ret[1] /= pitches.length;
            ret[2] /= pitches.length;

            return ret;
        }
    }
}

let song_obj = {};
let last_update = 0;
let progress_ms = 0;
let updated = false;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function get_song() {
    var config = {
        method: 'get',
        url: 'https://api.spotify.com/v1/me/player',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + ACCESS_TOKEN,
        }
    };

    axios(config).then(async (response) => {

        if (response.data === '') {
            await delay(5000);
            return;
        }

        if (!response.data['item'].hasOwnProperty('id'))
            return;

        let song_id = response.data['item']['id'];
        progress_ms = response.data['progress_ms'];
        song_obj = await audio_analysis(song_id);
        last_update = Date.now();

        tempo = current_tempo(song_obj, progress_ms);
        console.log('Set Tempo: ' + tempo);

        updated = true;
    }).catch((e) => {
        //console.log(e);
        console.log("Error with api");
    });

}

function update_color() {
    if (!updated)
        return;

    color = current_pitches(song_obj, progress_ms + Date.now() - last_update);
}

setInterval(get_song, 500);
setInterval(update_color, 50);
