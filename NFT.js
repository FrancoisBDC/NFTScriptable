// CONSTS //

const ME = false //true if you want to scan ME, false if you want to scan Solanart
const RECENT = true //true will sorts the nfts by the most recently listed, false will sort by price. Both in the selected marketplace
let DEFCOLLECTION = "pixcases_for_pixtapes" 
// the default collection that will be displayed if you dont input a specific one from the home screen
//⚠️ the name might be different between ME and Solanart, make sure it corresponds with the first const
const COLOR = "#e6e6e6" //custom color for text's background

// ALERTS CONSTS //

const FLOORALERTS = true //false if you dont want floor alerts
// If you are scanning the recently listed items, floor alerts will make additionnal requests that may result in more data/ battery consumption

const TITLESALERTS = true //false if you dont want alerts if specific nfts are listed 
// Be aware that of you are scanning the floor, title alerts will make additionnal requests that may result in more data/ battery consumption 

const FLOORINF = 2 //floor alert will be triggered if floor falls bellow this price
const FLOORSUP = 3 //same but will be triggered if floor gets above this price  
// 
const TITLES = ["halo"] 
// const TITLES = ["boo tape c90"] WORKS WITH ATTRIBUTES TOO

// write the names of the nfts you want, its not case sensitive and you dont need to write the whole name, if the title is "a nickel and a nail", its enough if you write "a nickel and", there is probably only one song with this name



let directLink

if (ME) {
  directLink = "https://magiceden.io/item-details/"
} else {
  directLink = "https://solanart.io/nft/"
}

const files = FileManager.local()
const filePath = files.bookmarkedPath("nft") 

// check of user asked a specific collection from home screen
let arg = args.widgetParameter

if (arg == null || arg == "") {
  arg = DEFCOLLECTION
}


let imagePath
let dataPath

if (RECENT == true) {
  imagePath = filePath + "/recent/nft.jpg" 
  dataPath = filePath + "/recent/data.json"   
} else {  
  imagePath = filePath + "/floor/nft.jpg"  
  dataPath = filePath + "/floor/data.json"
}


let noInternet
let img
let result

const MARKETPLACEURL = await generateAPIURL()
    
let data = await loadData(MARKETPLACEURL)

data = JSON.stringify(data).replaceAll("'", "’")
data = JSON.parse(data)

let widget = await createWidget(data)


if (!config.runsInWidget) {
    await widget.presentLarge()
}

Script.setWidget(widget)
Script.complete()


// FUNCTIONS //


async function loadData(url) {
  try {
    let req = new Request(url)
    result = await req.loadJSON()
    if (ME) {
      json = result["results"]
    } else {
      json = result["items"]
    }
    noInternet = false
    return json
  } catch(error) {
    
    log("no internet")
    noInternet = true
    return 404
  }
  
}


async function triggerTitleNotif([infos, name]) {
  if(ME) {
    title = infos["title"]
    adress = infos["mintAddress"]
  } else {
    title = infos["name"]
    adress = infos["token_add"]
  }
  price = infos["price"] + " sol"
  
  let notifTitle = new Notification()
  notifTitle.title= title + " was listed for " + price
  notifTitle.body = title + " was listed for " + price + "\nclick to see the NFT"
  notifTitle.openURL = directLink +  adress    
  notifTitle.identifier = "ttle"
  notifTitle.schedule()
}


async function createWidget(data) {  
  // VARS  
 let address, name, imgURL, price, floor, title, a, collectionName
 let floorReq = MARKETPLACEURL
 let titlesReq = MARKETPLACEURL
 let alerts=await Notification.allDelivered()

  alerts = JSON.stringify(alerts[0])
  
  if (alerts == undefined) {
    alerts = ""
  }

  let w = new ListWidget()

  if(data == 404) { //no internet - use cache
    img = files.readImage(imagePath)
    data = JSON.parse(files.readString(dataPath))  
  }
  
  result = data
  data = data[0] //[0] to obtain 1st item
// #################
  
  if (ME) {
    collectionName = data["collectionTitle"]
    imgURL = data["img"]
    name = data["title"]
    address = data["mintAddress"]
  } else {
    collectionName = arg
    imgURL = data["link_img"]
    name = data["name"]
    address = data["token_add"]     
  }  
  
  price = data["price"] 
  if(noInternet == false) {//get the image
    imgURL = encodeURI(imgURL)
    let imgReq = new Request(imgURL)
    img = await imgReq.loadImage()     
    files.writeImage(imagePath, img)
    files.writeString(dataPath, JSON.stringify(result))    
  }

    
////// TRIGGER TITLES NOTIF //////
  
  if(!noInternet && TITLESALERTS) {
    if (!RECENT) {
  // modify the api url to fetch recently listed nfts
      titlesReq = titlesReq.replace("takerAmount", "recentlyListed")  
      titlesReq = titlesReq.replace("der=&", "der=recent&")  
      
      titlesReq = new Request(titlesReq)
      title = await titlesReq.loadJSON()
      if(ME) {
        title = title["results"]
      } else {
        title = title["items"]
      }
    } else if(RECENT) {
      title = result
    }
      
    // check if there is a match with the wishlist
    for(let i=0; i<title.length; i++) {
      for(let k=0; k<TITLES.length; k++) {          
        a = JSON.stringify(title[i])   
//         log(a)    
        a = a.toLowerCase()
        let b = TITLES[k]
//         log(a)
        if(a.includes(b.toLowerCase())) {
          if(!alerts.includes(b)) {
            // notif already triggered ?
            triggerTitleNotif([title[i],b])
          }    
        }
      }
    }
  }
  
  
////// FLOOR ALERTS //////
  
  if(!noInternet && FLOORALERTS) {
    
    if(RECENT) {
      floorReq = floorReq.replace("recentlyListed", "takerAmount")  
      floorReq = floorReq.replace("recent", "")
      floorReq = new Request(floorReq)
      floor = await floorReq.loadJSON()
      
      if (ME) {
        floor = floor["results"][0].price
      } else {
        floor = floor["items"][0].price
      }
    } else if (!RECENT) {
      floor = price
    }
    floor = String(floor)
      
    if(floor<=FLOORINF || floor>=FLOORSUP) {
      if(alerts.includes(floor) == false) {  
       Notification.removeDelivered(["flr"])
        let notif = new Notification()
        notif.title = "Floor alert " + floor + " sol"
        notif.body = "Floor alert was triggered for " + collectionName + " with a " + floor + " SOL floor\nClick to see the nft"
        notif.openURL = directLink + address
        notif.identifier = "flr"  
        notif.schedule()
      }  
    }    
  }  
  
// ##################  
  
// CONTINUE WIDGET CREATION //
  
  if (arg.includes("pix")) {
     name=name.substring(name.indexOf("|")+2)
  } //if pixtapes/ pixcases, make a nice name
 
  price = String(price) + " SOL"
  
  w.backgroundImage = img
  w.url = directLink + address  
    
  let stack = w.addStack()
  stack.layoutVertically()
  stack.addSpacer()
  stack.url = directLink + address
    
  let stackInfos = w.addStack()
  stackInfos.backgroundColor = new Color(COLOR, 0.85)
  stackInfos.cornerRadius = 10
  stackInfos.addSpacer()
  stackInfos.url = directLink + address

  let textStack = stackInfos.addStack()
  textStack.layoutVertically()
  let nameStack = textStack.addStack()
  
  let nameText = nameStack.addText(name)
  nameStack.addSpacer()
  nameText.font = Font.boldRoundedSystemFont(14)
  textStack.setPadding(7.5, 3, 7.5, 3)
  let priceStack = textStack.addStack()
  let priceText = priceStack.addText(price + " on Magic Eden")
  priceText.font = Font.boldRoundedSystemFont(14)  
  stackInfos.addSpacer()
    
  return w
 
}

async function generateAPIURL() { // GENERATE API LINK WITH ARGUMENTS
  let param 
  let a 
  if (ME == true) {
    if (RECENT == true) {
      param = "recentlyListed"
    } else {
      param = "takerAmount"
    }
    
    a = encodeURI('https://api-mainnet.magiceden.io/rpc/getListedNFTsByQuery?q={"$match":{"collectionSymbol":"'+arg+'"},"$sort":{"'+ param+'":1,"createdAt":-1},"$skip":0,"$limit":20}')
  
  } else {
    if (RECENT == true) {
      param = "recent"  
    } else {
      param = ""
    }
    
    a = 'https://qzlsklfacc.medianetwork.cloud/get_nft?collection='+arg+'&page=0&limit=20&order='+param+'&fits=any&trait=&search=&min=0&max=0&listed=true&ownedby=&attrib_count=&bid=all'
  }
  
  return a 
}
