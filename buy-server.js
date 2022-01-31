/** @param {NS} ns **/
export async function main(ns) {
    let ram;                //How many GBs of RAM
	let i;                  //Counter
	let exp;
	let servers;
	let serverRam;
	let serverMaxxed = false;
	let myScript = "hacking2.js"
	let scriptRAM = ns.getScriptRam(myScript, "home");
	let threadNum;

	const SECONDS = 60;      //600 sec = 10 mins
	const MULT_THRESH = 100;    //Multiplier threshold
	const MIN_EXP = 4;

	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("killall");
	ns.disableLog("scp");
	ns.disableLog("getServerMaxRam");


	/*
		getServerMoneyAvailable(hostname)   = checks how much money is in the server
		purchaseServer(ram)                 = buy server with x amount of ram
		deleteServer(hostname)              = delete "serverName" server
		getPurchasedServers()               = string array of names of server that was bought
		getPurchasedServerCost(ram)         = cost to buy a server with x amount of ram
		getPurchasedServerLimit()           = max amount of server player can have
		getPurchasedServerMaxRam()          = max RAM a server can have
		getServerMaxRam(hostname)           = total RAM a server has
		scp(file, srcServer, destServer)    = copies file from source to destination
		killall(hostname)                   = kills all scripts running in server
	*/

	/*
		buy servers i can afford until i hit max server limit. make them run the hack script with max amt of thread
		once max server limit reached, go through each server and check their max ram
			if i can afford a server with more ram, delete server and replace new one. make them run the hack script with max amt of thread
			keep going until all servers have reached max ram available
	*/

	//Buy servers until limit reached
	i = ns.getPurchasedServers().length;
	while (i < ns.getPurchasedServerLimit()) {
		//Start with the max amount of RAM to purchase
		exp = Math.log(ns.getPurchasedServerMaxRam()) / Math.log(2); //equivalient to Math.log2(getPurchasedServerMaxRam())
		while (exp >= MIN_EXP) {
			ram = Math.pow(2, exp);
			if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram) * MULT_THRESH) {    //If i can afford the server
				ns.purchaseServer("myServer" + i, ram);    //Buy the server
				ns.print("A " + ram + " GB server has been purchased");
				await ns.scp(myScript, "home", "myServer" + i); //Copy the script over
				threadNum = Math.floor(ns.getServerMaxRam("myServer" + i) / scriptRAM);   //Thread = Server's total RAM / Script RAM required
				ns.exec(myScript, "myServer" + i, threadNum);
				i++;        //Increment to the next server
				exp = 0;    //Make the exp lower than 8 so it breaks off the while loop or else it's gonna keep buying a server
			} else {    //Else go to the next GB below
				ns.print("Not enough money to purchase a " + ram + " GB server");
				exp--;
			}
			await ns.sleep(1);
		}
		await ns.sleep(SECONDS * 1000);
	}
	ns.print("Max amount of server has been reached");

	servers = ns.getPurchasedServers();    //String array of purchased servers
	while (serverMaxxed == false) {		//Go through while loop if all servers do not have max RAM
		serverMaxxed = true;            //Set to true first. The for-loop will check if the current server isn't max RAM and it will change to false
		for (i = 0; i < servers.length; i++) {    			//Go though all bought servers
			serverRam = ns.getServerMaxRam(servers[i]);   		//Check their RAM
			if (serverRam != ns.getPurchasedServerMaxRam()) { 	//If server's RAM is not max RAM
				serverMaxxed = false;                       //Set the bool to false
				exp = Math.log(ns.getPurchasedServerMaxRam()) / Math.log(2); //Same as above; 
				while (exp > Math.log(serverRam) / Math.log(2)) {    //Make sure that it buys a higher RAM than the current
					ram = Math.pow(2, exp);
					if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(ram) * MULT_THRESH) {
						let serverName = servers[i];
						ns.killall(servers[i]);
						ns.deleteServer(servers[i]);
						ns.print(serverName + " (" + serverRam + "GB) has been deleted");
						ns.purchaseServer(serverName, ram);
						await ns.scp(myScript, "home", serverName); //Copy the script over
						threadNum = Math.floor(ns.getServerMaxRam(serverName) / scriptRAM);   //Thread = Server's total RAM / Script RAM required
						ns.exec(myScript, serverName, threadNum);
						ns.print(serverName + " (" + ram + "GB) has been purchased");
						exp = 0;    //Break off the loop
					} else {
						ns.print("Not enough money to purchase a " + ram + "GB server");
						exp--;  //Go to the next lowest RAM
					}
				}
			}
			await ns.sleep(SECONDS * 1000);
		}
		await ns.sleep(1);
	}
}
