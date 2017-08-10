const line    = require('@line/bot-sdk');
const http    = require('http');
const fs      = require('fs'); 
const tokens  = require('./tokens.js')
const Twitter = require('twitter');
const app = http.createServer();

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
      //console.log(WebhookEventObject);     
      if(WebhookEventObject.type === 'message'){
        let message;
        if(WebhookEventObject.message.type === 'text'){
          if(WebhookEventObject.message.text.match(/ツイートを取得|get tweet/)){
            message = {
              type: 'text',
              text: 'ツイートを取得するピヨ'
            }
            const replyToken = WebhookEventObject.replyToken
            client.replyMessage(replyToken, message).then( (body) => {
              console.log(body);
              twitClient.get('statuses/user_timeline', {screen_name : "sec_trend", count : 10}, (error, data, response) => {
                data.forEach( d => {
                  message = {
                    type: 'text',
                    text: d.text
                  };
                  client.pushMessage(WebhookEventObject.source.userId, message).then( (body) => {
                    console.log(body);
                  })
                  .catch( (e) => {
                    console.log(e);
                  });
                });
              });
            })
            .catch( (e) => {
              console.log(e);
            });
          }
        }  
      }
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('su');
  });
}).listen(process.env.PORT || 8123);

twitClient.stream('user', {}, function(stream) {
  console.log("streaming..");
  const searchUser = "sfeyrt"; //"sec_trend";
  const sec_trend = "sec_trend";//後で消す
  stream.on('data', function(tweet) {
    if((tweet.user.screen_name === searchUser && tweet.text) ||  tweet.user.screen_name === sec_trend && tweet.text ){
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