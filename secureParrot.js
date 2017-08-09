const line    = require('@line/bot-sdk');
const https   = require('https');
const fs      = require('fs'); 
const tokens   = require('./tokens.js')
const Twitter = require('twitter');

const options = {
  key:  fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.crt")
}
const app = https.createServer(options);

const client = new line.Client({
          channelAccessToken: tokens.line_channel_access_token
});
const twitClient = new Twitter({
  consumer_key: tokens.twitter_consumer_key,
  consumer_secret: tokens.twitter_consumer_secret,
  access_token_key: tokens.twitter_access_token_key,
  access_token_secret: tokens.twitter_access_token_secret
});
console.log("server running....");

process.on('uncaughtException', (err) => {
    console.log(err.stack);
});


app.on('request', (req, res) => {
  if(req.url !== '/' || req.method !== 'POST'){
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('');
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });        
  req.on('end', () => {
      if(body === ''){
        console.log('bodyが空です。');
        return;
      }

      let WebhookEventObject = JSON.parse(body).events[0];   
      console.log(WebhookEventObject);     
      if(WebhookEventObject.type === 'message'){
          let message;
          if(WebhookEventObject.message.type === 'text'){
              //TODO: ツイート取得コマンド追加
              message = {
                type: 'text',
                text: 'Hello World!'
              };
          }

          client.replyMessage(WebhookEventObject.replyToken, message)
          .then( (body) => {
            console.log(body);
          }).catch( (e) => {
            console.log(e);
          });
      }

      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('su');
  });
}).listen(process.env.PORT || 8123);

twitClient.stream('user', {}, function(stream) {
  console.log("streaming..");
  const searchUser = "sfeyrt"; //"sec_trend";
  stream.on('data', function(tweet) {
    if(tweet.user.screen_name === searchUser && tweet.text){
      console.log(tweet.text);
      const message = {
        type : 'text',
        text: tweet.text
      }; 
      //TODO: リスト内全体にpush, リストはDBから参照, トーク開始時に追加
      pushList = ["U78655227f469255d8a3473aa69c31fa4"];//後で変更する
      client.pushMessage(pushList[0], message)
          .then( (body) => {
            console.log(body);
          }).catch( (e) => {
            console.log(e);
      });
    }    
  });
 
  stream.on('error', function(error) {
    throw error;
  });
});
