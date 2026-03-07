const { Colors } = require("discord.js");
const { EmbedBuilder } = require("discord.js")
const nhentai = require("nhentai");
const api = new nhentai.API();

module.exports = {
    async GetDoujin(tag) {
        const tag = tag;
        const page = Math.floor((await api.search(tag).finally().catch(console.error())).numPages * Math.random());
        const page_chosen = (await api.search(tag, {page:page}).finally()).doujins;
        const doujin_chosen = page_chosen[Math.floor(Math.random() * page_chosen.length)];

        return doujin_chosen;
    },
    async CreateDoEmbed(doujin_chosen) {
        const nhentai_icon = 'https://nhentai.net/static/favicon-32x32.png'
        const m_Embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(doujin_chosen.titles.english)
            .setURL(doujin_chosen.url)
            .setAuthor({ name: doujin_chosen.tags.artists.map(value => `${value.name}`).join(", "), iconURL: nhentai_icon, url: 'https://nhentai.net/' })
            .setDescription(doujin_chosen.tags.tags.map(value => `${value.name}`).join(", "))
            .setThumbnail(nhentai_icon)
            .setImage(doujin_chosen.cover.url)
            .setTimestamp(doujin_chosen.uploadTimestamp)
            .setFooter({ text: "Likes:"+doujin_chosen.favorites, iconURL: nhentai_icon });
        return m_Embed;
    }
}