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
const port = process.env.PORT || 8123;
console.log("server running on " + port);

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
            client.replyMessage(WebhookEventObject.replyToken, message).then( (body) => {
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

      if(WebhookEventObject.type === "follow"){
        console.log("followed");
        const message = {
          type: "text",
          text: "ツイートを取得、もしくはget tweetでセキュリティに関するアカウントのツイートを取得するピヨ！"
        }
        client.replyMessage(WebhookEventObject.replyToken, message).then( (body) => {
          console.log(body);
        })
        .catch( (e) => {
          console.log(e);
        })
      }
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('su');
  });
}).listen(port);

twitClient.stream('user', {}, function(stream) {
  console.log("streaming..");
  const searchUsers = ["sec_trend", "sfeyrt", "ockeghem"];
  stream.on('data', function(tweet) {
    if( searchUsers.indexOf(tweet.user.screen_name) >= 0 && tweet.text ){
      console.log(tweet.text);
      const message = {
        type : 'text',
        text: tweet.text
      }; 
      //TODO: リスト内全体にpush, リストはDBから参照, トーク開始時に追加
      pushList = tokens.push_users;//後で変更する
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



