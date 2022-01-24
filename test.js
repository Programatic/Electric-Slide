const express = require('express');
const querystring = require('querystring');
const axios = require('axios');

const port = 8888;
const ACCESS_TOKEN = "BQCy9jU7Q1xcprG1NIQau1fHnPxtCsVI5MIs7FUduxi9Ftk5zGVGMDukSoaNAiMHpYj1384KX0RXvs9tuD0254PoCktkcft1ci--wzhWi9H_2Vsgsu_RkazAChTjHxsxRnUyyhhGzF6b8vHCmgO5kWaBQQ";

var client_id = '850d1647e0524185934a75a886c5bc1e';
var redirect_uri = 'http://localhost:8888/callback';

var app = express();

var tempo = 0;

app.get('/login', function(req, res) {

  var state = "abcdefghijklmnop" 
  var scope = 'user-read-playback-state';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', (req, res) => {
    console.log(req);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

app.get('/tempo', (req, res) => {
    res.send(tempo.toString());
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
        if (time_since_start/1000 >= sections[i]['start']) {
            return sections[i]['tempo'];
        }
    }
}

var config = {
  method: 'get',
  url: 'https://api.spotify.com/v1/me/player',
  headers: { 
    'Content-Type': 'application/json', 
    'Authorization': 'Bearer ' + ACCESS_TOKEN,
  }
};

axios(config)
.then(async function (response) {
    let song_id = response.data['item']['id'];
    let progress_ms = response.data['progress_ms'];

    let song_obj = await audio_analysis(song_id);
    tempo = current_tempo(song_obj, progress_ms);
    console.log('Set Tempo: ' + tempo);
})
.catch(function (error) {
  console.log(error);
});
