(() => {
	const commands = {
		"!time": opt_ => {
			return `*${new Date()}*`;
		},
		"!help": env => {
			return `Chat ${env.chat}: *!time*`;
		}
	};

	//
	// GLOBAL VARS AND CONFIGS
	//
	let lastMessageOnChat = false;
	let ignoreLastMsg = {};
	const elementConfig = {
		"chats": [1, 0, 5, 2, 0, 3, 0, 0, 0],
		"chat_icons": [0, 0, 1, 1, 1, 0],
		"chat_title": [0, 0, 1, 0, 0, 0, 0],
		"chat_lastmsg": [0, 0, 1, 1, 0, 0],
		"chat_active": [0, 0],
		"selected_title": [1, 0, 5, 3, 0, 1, 1, 0, 0, 0, 0]
	};


	//
	// FUNCTIONS
	//
	
	function getElement(id, parent){
		if (!elementConfig[id]){
			return false;
		}
		let elem = !parent ? document.body : parent;
		const elementArr = elementConfig[id];
		elementArr.forEach(function(pos) {
			if (!elem.childNodes[pos]){
				return false;
			}
			elem = elem.childNodes[pos];
		});
		return elem;
	}
	
	function getLastMsg(){
		const messages = document.querySelectorAll('.msg');
		let pos = messages.length-1;
		
		while (messages[pos] && (messages[pos].classList.contains('msg-system') || messages[pos].querySelector('.message-in'))){
			pos--;
			if (pos <= -1){
				return false;
			}
		}
		if (messages[pos] && messages[pos].querySelector('.selectable-text')){
			return messages[pos].querySelector('.selectable-text').innerText.trim();
		} else {
			return false;
		}
	}
	
	function getUnreadChats(){
		const unreadchats = [];
		let chats = getElement("chats");
		if (chats){
			chats = chats.childNodes;
			for (const i in chats){
				if (!(chats[i] instanceof Element)){
					continue;
				}
				const icons = getElement("chat_icons", chats[i]).childNodes;
				if (!icons){
					continue;
				}
				for (const j in icons){
					if (icons[j] instanceof Element){
						if (!(icons[j].childNodes[0].getAttribute('data-icon') == 'muted' || icons[j].childNodes[0].getAttribute('data-icon') == 'pinned')){
							unreadchats.push(chats[i]);
							break;
						}
					}
				}
			}
		}
		return unreadchats;
	}
	
	function didYouSendLastMsg(){
		const messages = document.querySelectorAll('.msg');
		if (messages.length <= 0){
			return false;
		}
		let pos = messages.length-1;
		
		while (messages[pos] && messages[pos].classList.contains('msg-system')){
			pos--;
			if (pos <= -1){
				return -1;
			}
		}
		if (messages[pos].querySelector('.message-out')){
			return true;
		}
		return false;
	}

	// Dispath an event (of click, por instance)
	const eventFire = (el, etype) => {
		const evt = document.createEvent("MouseEvents");
		evt.initMouseEvent(etype, true, true, window,0, 0, 0, 0, 0, false, false, false, false, 0, null);
		el.dispatchEvent(evt);
	};

	// Select a chat to show the main box
	const selectChat = (chat, cb) => {
		const title = getElement("chat_title",chat).title;
		eventFire(chat.firstChild.firstChild, 'mousedown');
		if (!cb) return;
		const loopFewTimes = () => {
			setTimeout(() => {
				const titleMain = getElement("selected_title").title;
				if (titleMain !== undefined && titleMain != title){
					console.log('not yet');
					return loopFewTimes();
				}
				return cb();
			}, 300);
		};

		loopFewTimes();
	};

	// Send a message
	const sendMessage = (chat, message, cb) => {
		// avoid duplicate sending
		let title;

		if (chat){
			title = getElement("chat_title",chat).title;
		} else {
			title = getElement("selected_title").title;
		}
		ignoreLastMsg[title] = message;
		
		const messageBox = document.querySelectorAll("[contenteditable='true']")[0];

		// add text into input field
		messageBox.innerHTML = message.replace(/ {2}/gm,'');

		// Force refresh
		const event = document.createEvent("UIEvents");
		event.initUIEvent("input", true, true, window, 1);
		messageBox.dispatchEvent(event);

		// Click at Send Button
		eventFire(document.querySelector('span[data-icon="send"]'), 'click');

		cb();
	};

	//
	// MAIN LOGIC
	//
	const start = (_chats, cnt = 0) => {
		// get next unread chat
		const chats = _chats || getUnreadChats();
		const chat = chats[cnt];
		
		let processLastMsgOnChat = false;
		let lastMsg;
		
		if (!lastMessageOnChat){
			if (false === (lastMessageOnChat = getLastMsg())){
				lastMessageOnChat = true; //to prevent the first "if" to go true everytime
			} else {
				lastMsg = lastMessageOnChat;
			}
		} else if (lastMessageOnChat != getLastMsg() && getLastMsg() !== false && !didYouSendLastMsg()){
			lastMessageOnChat = lastMsg = getLastMsg();
			processLastMsgOnChat = true;
		}
		
		if (!processLastMsgOnChat && (chats.length == 0 || !chat)) {
			console.log(new Date(), 'nothing to do now... (1)', chats.length, chat);
			return window.setTimeout(start, 3000);
		}

		// get infos
		let title;
		if (!processLastMsgOnChat){
			title = getElement("chat_title",chat).title + '';
			lastMsg = (getElement("chat_lastmsg", chat) || { innerText: '' }).innerText.trim(); //.last-msg returns null when some user is typing a message to me
		} else {
			title = getElement("selected_title").title;
		}
		// avoid sending duplicate messaegs
		if (ignoreLastMsg[title] && (ignoreLastMsg[title]) == lastMsg) {
			console.log(new Date(), 'nothing to do now... (2)', title, lastMsg);
			return window.setTimeout(() => { start(chats, cnt + 1); }, 100);
		}

		// what to answer back?
		let chatFn;

		for (const key in Object.keys(commands)) {
			if (lastMsg.startsWith(key)) {
				chatFn = commands[key];
				break;
			}
		}
		
		let sendText;

		if (chatFn) {
			sendText = chatFn({
				chat: title,
			});
		} else {
			ignoreLastMsg[title] = lastMsg;
			//console.log(new Date(), 'new message ignored -> ', title, lastMsg);
			return window.setTimeout(() => { start(chats, cnt + 1); }, 100);
		}

		console.log(new Date(), 'new message to process -> ', title, lastMsg);

		// select chat and send message
		if (!processLastMsgOnChat){
			selectChat(chat, () => {
				sendMessage(chat, sendText.trim(), () => {
					window.setTimeout(() => { start(chats, cnt + 1); }, 1000);
				});
			});
		} else {
			sendMessage(null, sendText.trim(), () => {
				window.setTimeout(() => { start(chats, cnt + 1); }, 1000);
			});
		}
	};
	start();
})();
