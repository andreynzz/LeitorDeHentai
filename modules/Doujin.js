const { Colors } = require("discord.js");
const { EmbedBuilder } = require("discord.js")
const nhentai = require("nhentai");
const api = new nhentai.API();

module.exports = {
    async GetDoujin(tag = "*") {
        const page = Math.floor((await api.search(tag).finally().catch(console.error())).numPages * Math.random());
        if (page < 1) { console.error("This tag doesn't exist"); return;}
        const page_chosen = (await api.search(tag, {page:page}).finally()).doujins;
        const doujin_chosen = page_chosen[Math.floor(Math.random() * page_chosen.length)];

        return doujin_chosen;
    },
    CreateDoujinEmbed(doujin) {
        const nhentai_icon = 'https://nhentai.net/static/favicon-32x32.png'
        const m_Embed = new EmbedBuilder()
            .setColor(Colors.Red)
            .setTitle(doujin.titles.english)
            .setURL(doujin.url)
            .setAuthor({ name: doujin.tags.artists.map(value => `${value.name}`).join(", "), iconURL: nhentai_icon, url: 'https://nhentai.net/' })
            .setDescription(doujin.tags.tags.map(value => `${value.name}`).join(", "))
            .setThumbnail(nhentai_icon)
            .setImage(doujin.cover.url)
            .setTimestamp(doujin.uploadTimestamp)
            .setFooter({ text: "Likes:"+doujin.favorites, iconURL: nhentai_icon });
        return m_Embed;
    }
}