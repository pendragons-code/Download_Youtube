#!/usr/bin/env node

const fs = require("fs");
const { validateURL } = require("ytdl-core");
const ytpl = require("ytpl");
const figlet = require("figlet");
const inquirer = require("inquirer");
const color = require("./functions/color");
const Download = require("./functions/download");

const download = new Download();
const dir = "./músicas";

console.log(color(figlet.textSync("Download_Youtube"), "cian"));

async function main() {
	try {
		const { url, format } = await inquirer.prompt([
			{
				name: "url",
				message: "Link do vídeo ou da playlist:",
				validate(answer) {
					if (!answer.trim()) {
						return "Digite ou cole o link, esta ação é obrigatória.";
					}
					if (validateURL(answer.trim()) || ytpl.validateID(answer.trim())) {
						return true;
					}
					return "Digite ou cole o link, esta ação é obrigatória.";
				},
			},
			{
				type: "list",
				message: "Escolha o formato de download:",
				name: "format",
				choices: ["MP4", "MP3"],
			},
		]);

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}

		if (validateURL(url)) {
			await download.download({ url, type: format, dir });
		} else {
			const playlistInfo = await ytpl(url, { pages: 1 });

			if (playlistInfo.estimatedItemCount > 100) {
				playlistInfo = await ytpl(url, {
					pages: Math.ceil(playlistInfo.estimatedItemCount / 100, 1),
				});
			}

			const playlistDir = `${dir}/${playlistInfo.title.normalize("NFD").replace(
				/[\u0300-\u036f]/g,
				"",
			)}`;

			if (!fs.existsSync(playlistDir)) {
				fs.mkdirSync(playlistDir);
			}

			for (let i = 0; i < playlistInfo.items.length; i++) {
				const url = playlistInfo.items[i].shortUrl;
				const num = i + 1;
				playlistInfo.items[i].index = num;
				console.log(num, color(url, "white"));
			}

			await download.playlist({ list: playlistInfo, type: format, dir: playlistDir });
		}
	} catch (error) {
		console.log(color(`[ERROR] - ${error.message}`, "red"));
	}
}

main();
