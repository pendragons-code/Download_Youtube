const ffmpeg = require('fluent-ffmpeg');
const ytdl = require('ytdl-core');
const delay = require('util').promisify(setTimeout);
const events = require('events');
const Events = new events();
const fs = require('fs');
const color = require('./color');

const data = {
  ListLength: 0,
  SuccessLength: 0,
  ErrorLength: 0,
};

let end;

Events.on('Downloaded', async ({ data, resolution }) => {
  if (data.SuccessLength >= data.ListLength) {
    console.log('\n\n');
    console.log(
      color(
        `[LOG] - Download Completo! Success: ${data.SuccessLength}, Error: ${data.ErrorLength} encerrando processos...`,
        'blue'
      )
    );
    console.log('\n\n');
    await delay(2500);
    resolution();
  }
});

class Download {
  constructor() {
    this.version = require('../../package.json').version;
  }

  async download({ url, type, dir }) {
    console.log('\n\n');
    console.log(color('[LOG] - Carregando...', 'blue'));
    console.log('\n\n');

    try {
      const info = await ytdl.getInfo(url);

      if (!info) {
        console.log(color(`[ERROR] - música ${url}`, 'red'));
        return;
      }

      data.ListLength = 1;

      const name = this.formatName(info.videoDetails.title);

      if (type === 'MP4') {
        end = '.mp4';
        this.downloadAndProcessVideo(url, dir, name);
      } else if (type === 'MP3') {
        end = '.mp3';
        this.downloadAndProcessAudio(url, dir, name);
      }
    } catch (error) {
      console.log(color(`[ERROR] - ${error.message}`, 'red'));
    }
  }

  async playlist({ list, type, dir }) {
    console.log('\n\n');
    console.log(color('[LOG] - Carregando...', 'blue'));
    console.log('\n\n');

    if (list.items.length <= 0) {
      console.log(color('[ERROR] - Ocorreu um erro! verifique o link e tente novamente.', 'red'));
      return;
    }

    data.ListLength = list.items.length;

    if (type === 'MP4') {
      end = '.mp4';
    } else if (type === 'MP3') {
      end = '.mp3';
    }

    for (let i = 0; i < list.items.length; i++) {
      const obj = list.items[i];

      try {
        const info = await ytdl.getInfo(obj.shortUrl);

        if (!info) {
          console.log(color(`[ERROR] - música ${obj.index} - ${obj.shortUrl}`, 'red'));
          data.ListLength -= 1;
          data.ErrorLength += 1;
        } else {
          const name = this.formatName(`${obj.index}-${info.videoDetails.title}`);
          if (type === 'MP4') {
            this.downloadAndProcessVideo(obj.shortUrl, dir, name);
          } else if (type === 'MP3') {
            this.downloadAndProcessAudio(obj.shortUrl, dir, name);
          }
          await delay(1500);
        }
      } catch (error) {
        console.log(color(`[ERROR] - ${error.message}`, 'red'));
      }
    }
  }

  formatName(title) {
    return title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/([^\w]+|\s+)/g, '-')
      .replace(/\-\-+/g, '-')
      .replace(/(^-+|-+$)/, '');
  }

  downloadAndProcessVideo(url, dir, name) {
    ytdl(url, { filter: (format) => format.itag === 18 })
      .pipe(fs.createWriteStream(`${dir}/${name}${end}`))
      .on('finish', () => {
        console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
        data.SuccessLength += 1;
        Events.emit('Downloaded', { data, resolution: this.resolution });
      })
      .on('error', (err) => {
        console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
        console.error(err);
        data.ErrorLength += 1;
        Events.emit('Downloaded', { data, resolution: this.resolution });
      });
  }

  downloadAndProcessAudio(url, dir, name) {
    const stream = ytdl(url, { quality: 'highestaudio' });
    ffmpeg(stream)
      .audioBitrate(320)
      .save(`${dir}/${name}${end}`)
      .on('error', (err) => {
        console.log(color(`[ERROR] - música: ${name} - ${url}`, 'red'));
        console.error(err);
        data.ErrorLength += 1;
        Events.emit('Downloaded', { data, resolution: this.resolution });
      })
      .on('end', () => {
        console.log(color('[DOWNLOADED] ' + name + end, 'magenta'));
        data.SuccessLength += 1;
        Events.emit('Downloaded', { data, resolution: this.resolution });
      });
  }

  resolution() {
    // Your resolution logic here
  }
}

module.exports = Download;

