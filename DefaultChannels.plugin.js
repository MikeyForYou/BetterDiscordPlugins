//META{"name":"DefaultChannels","website":"https://github.com/planetarian/BetterDiscordPlugins","source":"https://github.com/planetarian/BetterDiscordPlugins/blob/master/DefaultChannels.plugin.js"}*//

class DefaultChannels {
    getName() { return "DefaultChannels"; }
    getDescription() {
        return "Allows you to force discord to switch to a specific channel the first time (or every time) "
        + "you switch to a particular server after launching discord. "
        + "Good for e.g. checking announcement channels before moving elsewhere.";
    }
    getVersion() { return "0.0.10a"; }
    getAuthor() { return "Chami"; }

    constructor() {
        this.updatedServers = [];
        this.classesDefault = {
            label: "label-JWQiNe",
            guild: "guild-1EfMGQ",
            guildSelected: "selected-ML3OIq",
            chat: "chat-3bRxxu",
            searchBar: "searchBar-2_Yu-C",
            channels: "channels-Ie2l6A",
            channelName: "name-3M0b8v",
            channelNameUnreadText: "nameUnreadText-DfkrI4",
            contextMenu: "contextMenu-HLZMGh",
            item: "item-1Yvehc",
            itemToggle: "itemToggle-S7XGOQ"
        };
        this.classesNormalized = {
            appMount: "da-appMount",
            label: "da-label",
            guild: this.classesDefault.guild,
            guildSelected: this.classesDefault.guildSelected,
            chat: "da-chat",
            searchBar: "da-searchBar",
            channels: "da-channels",
            channelName: "da-name",
            channelNameUnreadText: "da-nameUnreadText",
            contextMenu: "da-contextMenu",
            item: "da-item",
            itemToggle: "da-itemToggle"
        };
        this.defaultSettings = {
            DefaultChannels: {
                globalSwitchMode: "firstOnly",
                defaultChannels: {},
                perServerSwitchModes: {},
                useNormalizedClasses: true
            }
        };
        this.settings = this.defaultSettings;
        this.labels = {
            inherit: "Use Global",
            firstOnly: "First Open",
            always: "Always",
            unread: "Unread"
        };
    }

    updateClasses() {
        this.classes = (global.bdSettings
            && global.bdSettings.settings["fork-ps-4"]
            && this.settings.DefaultChannels.useNormalizedClasses)
            ? this.classesNormalized
            : this.classesDefault;
    }


    getSettingsPanel() {
        var panel = $("<form>").addClass("form").css("width", "100%");
        this.generateSettings(panel);
        return panel[0];
    }

    generateSettings(panel) {
        let config = this.settings.DefaultChannels;
        new PluginSettings.ControlGroup("Settings", () => {
            this.saveSettings();
        }, {
            shown: true
        }).appendTo(panel).append(
            new PluginSettings.Checkbox("First switch only", "If enabled, will only switch to the default channel the first time you switch to its server after discord loads.",
                config.globalSwitchMode == "firstOnly" || config.firstSwitchOnly, (checked) => { config.firstSwitchOnly = checked; if (checked) config.globalSwitchMode = "firstOnly";}),
            new PluginSettings.Checkbox("Use normalized classes", "If enabled, will make use of BandagedBD's 'Normalize Classes' feature where possible. Should make the plugin more resilient to Discord updates.",
                config.useNormalizedClasses, (checked) => config.useNormalizedClasses = checked)
        );
    }
    
    loadSettings() {
        this.settings = PluginUtilities.loadSettings(this.getName(), this.defaultSettings);
        this.updateClasses();
    }

    saveSettings() {
        PluginUtilities.saveSettings(this.getName(), this.settings);
        this.updateClasses();
    }

    // Called when the plugin is loaded in to memory
    load() { this.log('Loaded'); }

    // Called when the plugin is activated (including after reloads)
    start() {
        let libraryScript = document.getElementById('zeresLibraryScript');
        if (!libraryScript || (window.ZeresLibrary && window.ZeresLibrary.isOutdated)) {
            if (libraryScript) libraryScript.parentElement.removeChild(libraryScript);
            libraryScript = document.createElement("script");
            libraryScript.setAttribute("type", "text/javascript");
            libraryScript.setAttribute("src", "https://rauenzi.github.io/BetterDiscordAddons/Plugins/PluginLibrary.js");
            libraryScript.setAttribute("id", "zeresLibraryScript");
            document.head.appendChild(libraryScript);
        }

        if (window.ZeresLibrary) this.initialize();
        else libraryScript.addEventListener("load", () => { this.initialize(); });
        
        this.log('Started');
    }

    // Called when the plugin is deactivated
    stop() {
        this.log('Stopped');
    }

    unload() { this.log('Unloaded'); }

    log(text) {
        return console.log(`[%c${this.getName()}%c] ${text}`,
            'color: #F77; text-shadow: 0 0 1px black, 0 0 2px black, 0 0 3px black;', '');
    }

    observer({ addedNodes, removedNodes }) {
        if (!this.classes || !addedNodes || !addedNodes[0] || !addedNodes[0].classList) return;
        let element = addedNodes[0];

        // Detect server switch
        if (element.classList.contains(this.classes.searchBar) || element.classList.contains(this.classes.chat)) {
            this.update();
        }

        
        // Update channel context menu
        if (element.classList.contains(this.classes.contextMenu)) {
            let menuItems = $(element).find('.' + this.classes.item);
            // Attempt to find the name of the channel we rightclicked by looking for the 'Mute #channel' item
            let preItem = null;
            let channelName = null;
            for (var i = 0; i < menuItems.length && !preItem; i++) {
                let strongItems = $(menuItems[i]).find('div > strong');
                for (var s = 0; s < strongItems.length && !preItem; s++) {
                    let si = strongItems[s];
                    if (si.innerText && si.innerText.startsWith('#')) {
                        channelName = si.innerText.substring(1);
                        preItem = menuItems[i];
                    }
                }
            }
            if (!preItem) return; // Not a channel

            // Get the ID for the channel name we found
            let ids = this.getGuildLinkIds();
            let guildId = ids.guildId;
            let channels = DiscordModules.GuildChannelsStore.getChannels(guildId)[0];
            let channelId = null;
            for (var c = 0; c < channels.length; c++) {
                let channel = channels[c].channel;
                if (channel.name == channelName) {
                    channelId = channel.id;
                    break;
                }
            }


            let config = this.settings.DefaultChannels;

            let isDefaultChannel = config.defaultChannels[guildId] == channelId;
            let defaultChannelToggle = $('<div class="'+this.classesDefault.item+' '+this.classesDefault.itemToggle+' dc-defaultChannelToggle"><div class="'+this.classesDefault.label
                +'">Default Channel</div><div class="checkbox"><div class="checkbox-inner"><input type="checkbox"'
                + (isDefaultChannel ? ' checked' : '')
                + '><span></span></div><span></span></div></div></div>')[0];


            // Add the toggle menuitem, preferably right below the 'Mute #channel' item, but otherwise put it wherever
            if (preItem.nextSibling)
                preItem.parentNode.insertBefore(defaultChannelToggle, preItem.nextSibling);
            else
                preItem.parentNode.append(defaultChannelToggle);

            // Handle the click event -- set the default channel and save the settings to file
            let self = this;
            let activeDefaultChannelToggle = $('.dc-defaultChannelToggle');

            // Server name for logging purposes
            let guildName = DiscordModules.GuildStore.getGuild(guildId).name;

            // Event for handling click of switch mode toggle
            let switchModeToggleClick = e => {
                let config = this.settings.DefaultChannels;
                if (config.perServerSwitchModes[guildId] == "firstOnly")
                    config.perServerSwitchModes[guildId] = "always";
                else if (config.perServerSwitchModes[guildId] == "always")
                    config.perServerSwitchModes[guildId] = "unread";
                else if (config.perServerSwitchModes[guildId] == "unread")
                    config.perServerSwitchModes[guildId] = "inherit";
                else // inherit/null
                    config.perServerSwitchModes[guildId] = "firstOnly";
                
                $('.dc-switchModeDescription').text(this.labels[config.perServerSwitchModes[guildId]]);
                this.log("Default channel for '" + guildName + "' switch mode set to '"+config.perServerSwitchModes[guildId]+"'.");
                self.saveSettings();
            };

            // Generate the switch mode element
            let activeSwitchModeItem = null;
            let generateSwitchModeToggle = function(channelToggleItem) {
                let switchMode = config.perServerSwitchModes[guildId];
                if (switchMode == null)
                    switchMode = "inherit";

                let item = $('<div class="'+self.classesDefault.item+' '+self.classesDefault.itemToggle+' dc-inheritModeToggle"><div class="'+self.classesDefault.label
                    +'">Default When: <span class="dc-switchModeDescription">'
                    + self.labels[switchMode]
                    + '</span></div></div></div>')[0];

                if (channelToggleItem.nextSibling)
                    channelToggleItem.parentNode.insertBefore(item, channelToggleItem.nextSibling);
                else
                    channelToggleItem.parentNode.append(item);
                    
                activeSwitchModeItem = $('.dc-inheritModeToggle');
                activeSwitchModeItem.click(switchModeToggleClick);
            };
            if (isDefaultChannel) generateSwitchModeToggle(defaultChannelToggle);

            // Handle clicking default channel toggle
            activeDefaultChannelToggle.click(e => {
                if (config.defaultChannels[guildId] == channelId) {
                    delete config.defaultChannels[guildId];
                    delete config.perServerSwitchModes[guildId];
                    activeSwitchModeItem.remove();
                    activeDefaultChannelToggle.find("input").prop("checked", false);
                    this.log("Default channel for '" + guildName + "' unset.");
                }
                else {
                    config.defaultChannels[guildId] = channelId;
                    config.perServerSwitchModes[guildId] = "inherit";
                    generateSwitchModeToggle(defaultChannelToggle);
                    activeDefaultChannelToggle.find("input").prop("checked", true);
                    this.log("Default channel for '" + guildName + "' set to '#" + channelName + "'.");
                }
                self.saveSettings();
            });
        }
    }

    // Called when a message is received
    onMessage() {}

    // Called when a server or channel is switched
    onSwitch() {}
    
    initialize(){
        this.loadSettings();
        this.update();
        PluginUtilities.checkForUpdate(this.getName(), this.getVersion(),
            "https://raw.githubusercontent.com/planetarian/BetterDiscordPlugins/master/DefaultChannels.plugin.js");
    }

    update() {
        let ids = this.getGuildLinkIds();
        if (ids.guildId == null) return; // Not a server
        
        let config = this.settings.DefaultChannels;
        let switchMode = config.perServerSwitchModes[ids.guildId];
        let channelId = config.defaultChannels[ids.guildId];
        if (!channelId) return; // No default channel set

        let channelName = DiscordModules.ChannelStore.getChannel(channelId).name;
        let el = $('div.'+this.classes.channels+' .'+this.classes.channelName+':contains("'+channelName+'")')[0];
        let hasUnread = el && el.classList && el.classList.contains(this.classes.channelNameUnreadText);
        

        if (((((switchMode == "inherit" || switchMode == null) && config.firstSwitchOnly)
            || switchMode == "firstOnly") && this.updatedServers[ids.guildId]) // Already performed the default channel switch
        || (switchMode == "unread" && !hasUnread) // No new messages
        || DiscordModules.SelectedChannelStore.getChannelId() == channelId) // Already in the default channel
            return;
        
        this.updatedServers[ids.guildId] = true;
        DiscordModules.NavigationUtils
            .transitionTo("/channels/" + ids.guildId + "/" + channelId);
        this.log("Switched to default channel on '" + DiscordModules.GuildStore.getGuild(ids.guildId).name + "'");
    }

    // Get the guild/channel ids from the guild icon link. Note that the channel id returned is independent of the current channel.
    getGuildLinkIds() {
        let guildLink = $('div.'+this.classes.guild+'.'+this.classes.guildSelected+' a').attr('href');
        let match = /\/channels\/(\d+)\/(\d+)/.exec(guildLink);
        return {
            guildId:match==null?null:match[1],
            channelId:match==null?null:match[2]
        };
    }
}
