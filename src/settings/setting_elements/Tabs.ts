import {setIcon} from "obsidian";

export interface Tab {
    title: string;
    icon: string;
    content_generator: (container_element: HTMLElement) => void;
}

export interface TabStructure {
    header: HTMLElement,
    buttons: {
        [key: string]: HTMLElement,
    }
    contentContainers: {
        [key: string]: HTMLElement,
    },
}

export interface Tabs {
    [key: string]: Tab;
}

interface TabContentContainers {
    [key: string]: HTMLElement,
}

interface TabButtons {
    [key: string]: HTMLElement,
}

export function createTabs(container_element: HTMLElement, tabs: Tabs): TabStructure {
    const tab_header = container_element.createEl("div", {attr: {class: "SC-tab-header"}});
    const tab_content_containers: TabContentContainers = {};
    const tab_buttons: TabButtons = {};
    let first_button: HTMLElement;
    for (let tab_id in tabs) {
        let tab = tabs[tab_id];

        // Create button
        let button = tab_header.createEl("button", {attr: {class: "SC-tab-header-button", activateTab: "SC-tab-" + tab_id}});
        button.onclick = tab_button_clicked;
        setIcon(button, tab.icon);
        button.insertAdjacentText("beforeend", " " + tab.title);
        tab_buttons[tab_id] = button;

        // Create content container
        tab_content_containers[tab_id] = container_element.createEl("div", {attr: {class: "SC-tab-content", id: "SC-tab-" + tab_id}});

        // Generate content
        tab.content_generator(tab_content_containers[tab_id]);

        // Memorize the first tab's button
        if (!first_button) {
            first_button = button;
        }
    }

    // Activate the first tab
    if (first_button) {
        first_button.click();
    }

    // Return a TabStructure
    return {
        header: tab_header,
        buttons: tab_buttons,
        contentContainers: tab_content_containers,
    };
}

function tab_button_clicked(event: MouseEvent) {
    let max_height = 0;
    const tab_contents = document.getElementsByClassName("SC-tab-content");
    for (let index= 0; index < tab_contents.length; index++) {
        let tab_content = (tab_contents.item(index) as HTMLElement);

        // Get the maximum tab height so that all tabs can have the same height.
        tab_content.addClass("SC-tab-active"); // Need to make the tab visible temporarily in order to get the height.
        if (tab_content.offsetHeight > max_height) {
            max_height = tab_content.offsetHeight;
        }

        // Finally hide the tab
        tab_content.removeClass("SC-tab-active");
    }

    // Remove active status from all buttons
    const tab_buttons = document.getElementsByClassName("SC-tab-header-button");
    for (let index= 0; index < tab_buttons.length; index++) {
        let tab_button = (tab_buttons.item(index) as HTMLElement);
        tab_button.removeClass("SC-tab-active");
    }

    // Activate the clicked tab
    let tab_button = event.target as HTMLElement;
    tab_button.addClass("SC-tab-active");
    const activate_tab_id = tab_button.attributes.getNamedItem("activateTab").value;
    const tab_content = document.getElementById(activate_tab_id);
    tab_content.addClass("SC-tab-active");

    // Apply the max height to this tab
    tab_content.style.height = max_height+"px";

    // Do nothing else (I don't know if this is needed or not)
    event.preventDefault();
}