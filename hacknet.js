/** @param {NS} ns **/
let debugMode = false;
let buyNode = true;
let upgradeFlag = false;
let nodeStats;
let sec = 30;
let availableMoney = 0;
let minCost = 0, ultimateMin = 0;
let numUpgradeL = 0, numUpgradeR = 0, numUpgradeC = 0;
let costL = 0, costR = 0, costC = 0, costP = 0;
let temp;
let totalNodes = 0;
let timeElapsed = 0;
const SECONDS = 60;

function money(ns) {
	return ns.getServerMoneyAvailable("home");
}

function updateTotalNodes(ns) {
	return ns.hacknet.numNodes();
}

function getNodeProduction(ns, totalNodes) {
	let prod = 0;
	let nodeStats;
	for (let i = 0; i < totalNodes; i++) {
		nodeStats = ns.hacknet.getNodeStats(i);
		prod += nodeStats.production;
	}
	return prod;
}

async function findAffordableUpgrade(ns, nodeToUpgrade, max, money, type) {
	if (debugMode) ns.print("max(Upgrade): " + max);
	if (max < 2) return max;

	let minUpgrade = 0;
	let maxUpgrade = max;
	let moneyAvailable = money;
	let avg = 0, oldAvg = 0;
	let found = false;
	let upgradeCost = 0;

	if (maxUpgrade - minUpgrade > 7) {
		while (found == false) {
			let avg = Math.round((maxUpgrade + minUpgrade) / 2);

			if (debugMode) {
				ns.print("minUpgrade: " + minUpgrade);
				ns.print("maxUpgrade: " + maxUpgrade);
				ns.print("avg:        " + avg);
				ns.print("oldAvg:     " + oldAvg);
			}

			if (oldAvg == avg) {
				found = true;
			}

			if (type == "level") {
				upgradeCost = ns.hacknet.getLevelUpgradeCost(nodeToUpgrade, avg);
			}
			else if (type == "ram") {
				upgradeCost = ns.hacknet.getRamUpgradeCost(nodeToUpgrade, avg);
			}
			else if (type == "core") {
				upgradeCost = ns.hacknet.getCoreUpgradeCost(nodeToUpgrade, avg);
			}
			if (debugMode) {
				ns.print("upgradeCost +" + avg + ": $" + Math.round(upgradeCost));
				ns.print("Available money: $" + Math.round(money));
			}

			if (upgradeCost <= money) {				//upgradeCost <= money	=	can afford
				minUpgrade = avg;
				oldAvg = avg;
			} else {								//money < upgradeCost	=	can't afford
				if (maxUpgrade == avg) {
					maxUpgrade--;
				} else {
					maxUpgrade = avg;
					oldAvg = avg;
				}
			}
			await ns.sleep(1);
		}

		if (upgradeCost < availableMoney) {
			return maxUpgrade;
		} else if (upgradeCost < availableMoney) {
			return minUpgrade;
		} else {
			return avg;
		}
	} else {
		while (minUpgrade < maxUpgrade) {
			if (type == "level") {
				upgradeCost = ns.hacknet.getLevelUpgradeCost(nodeToUpgrade, minUpgrade);
			}
			else if (type == "ram") {
				upgradeCost = ns.hacknet.getRamUpgradeCost(nodeToUpgrade, minUpgrade);
			}
			else if (type == "core") {
				upgradeCost = ns.hacknet.getCoreUpgradeCost(nodeToUpgrade, minUpgrade);
			}
			if (debugMode) {
				ns.print("upgradeCost +" + minUpgrade + ": $" + Math.round(upgradeCost));
				ns.print("Available money: $" + Math.round(money));
			}

			if (upgradeCost > moneyAvailable) {
				return minUpgrade - 1;
			} else {
				minUpgrade++;
			}
			await ns.sleep(1);
		}
		return minUpgrade - 1;
	}
}

function findMin(a, b, c, d) {
	let tempArr = [];
	if (a != 0) tempArr.push(a);
	if (b != 0) tempArr.push(b);
	if (c != 0) tempArr.push(c);
	if (d != 0) tempArr.push(d);

	return Math.min.apply(Math, tempArr);
}

async function findSleepTime(ns, time) {
	let days = 0;
	let hours = 0;
	let mins = 0;
	let seconds = time;
	if (seconds > 79800) {
		days = seconds / 79800;
		seconds = seconds % 79800;
	}
	if (seconds > 3600) {
		hours = seconds / 3600;
		seconds = seconds % 3600;
	}
	if (seconds > 60) {
		mins = seconds / 60;
		seconds = seconds % 60;
	}
	ns.print("Sleeping for " + Math.floor(days) + "d " + Math.floor(hours) + "h " + Math.floor(mins) + "m " + Math.round(seconds) + "s");
	await ns.sleep(time * 1000);
}

export async function main(ns) {
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("sleep");

	while (true) {
		totalNodes = updateTotalNodes(ns);
		ultimateMin = ns.hacknet.getPurchaseNodeCost();
		ns.print("\nTotal Nodes: " + totalNodes);

		if (totalNodes == 0) {
			ns.hacknet.purchaseNode();
			ns.print("A node has been purchased.");
		} else {
			//availableMoney = getNodeProduction(ns, totalNodes) * timeElapsed;
			availableMoney = ns.getServerMoneyAvailable("home") / 100;
		}
		if (!debugMode) ns.print("Available money for upgrade: $" + Math.round((availableMoney)));

		//Go through each node
		for (let i = 0; i < totalNodes; i++) {
			if (debugMode) ns.print("Node " + i);
			//Get stats and cost of level, ram, and core
			nodeStats = ns.hacknet.getNodeStats(i);

			//Find max # of upgrades can be done with the money
			numUpgradeL = await findAffordableUpgrade(ns, i, 200 - nodeStats.level, availableMoney, "level");
			numUpgradeR = await findAffordableUpgrade(ns, i, 6 - (Math.log(nodeStats.ram) / Math.log(2)), availableMoney, "ram");
			numUpgradeC = await findAffordableUpgrade(ns, i, 16 - nodeStats.cores, availableMoney, "core");

			if (debugMode) ns.print("Available Money: $" + Math.round((availableMoney)));
			if (debugMode) ns.print("Level +" + numUpgradeL);
			if (debugMode) ns.print("RAM   +" + numUpgradeR);
			if (debugMode) ns.print("Cores +" + numUpgradeC);

			costP = ns.hacknet.getPurchaseNodeCost();
			//Find the cost of the upgrades or a node purchase
			//if (numUpgradeL > 0 || numUpgradeR > 0 || numUpgradeC > 0 || costP < availableMoney) {
			costL = ns.hacknet.getLevelUpgradeCost(i, numUpgradeL);
			costR = ns.hacknet.getRamUpgradeCost(i, numUpgradeR);
			costC = ns.hacknet.getCoreUpgradeCost(i, numUpgradeC);

			ns.print("Node " + i);
			ns.print("Available Money: $" + Math.round((availableMoney)));
			if (numUpgradeL > 0) ns.print("Level +" + numUpgradeL + " cost: $" + Math.round(costL));
			if (numUpgradeR > 0) ns.print("RAM +" + numUpgradeR + " cost:\t $" + Math.round(costR));
			if (numUpgradeC > 0) ns.print("Core +" + numUpgradeC + " cost:\t $" + Math.round(costC));
			if (availableMoney > costP) ns.print("Node +1 cost:\t $" + Math.round(costP));

			minCost = findMin(costL, costR, costC, costP);
			if (minCost < availableMoney) ns.print("Min cost:\t $" + Math.round(minCost));

			if (minCost < ultimateMin) {
				ultimateMin = minCost;
			}

			if (minCost == costP && costP < availableMoney) {
				//if its cheaper to buy a node, buy a node instead of upgrading
				buyNode = true; //I put this as bool instead of putting the purchase node function here since I dont want to keep buying a node every iteration
			} else if (minCost == costL && costL < availableMoney) {
				//upgrade level
				availableMoney -= costL;
				ns.hacknet.upgradeLevel(i, numUpgradeL);

				temp = nodeStats.level;
				nodeStats = ns.hacknet.getNodeStats(i);
				ns.print("Node " + i + " upgraded Level: " + temp + " -> " + nodeStats.level);

				upgradeFlag = true;
				buyNode = false;
			} else if (minCost == costR && costR < availableMoney) {
				//upgrade ram
				availableMoney -= costR;
				ns.hacknet.upgradeRam(i, numUpgradeR);

				temp = nodeStats.ram;
				nodeStats = ns.hacknet.getNodeStats(i);
				ns.print("Node " + i + " upgraded RAM: " + temp + " -> " + nodeStats.ram);

				upgradeFlag = true;
				buyNode = false;
			} else if (minCost == costC && costC < availableMoney) {
				//upgrade core
				availableMoney -= costC;
				ns.hacknet.upgradeCore(i, numUpgradeC);

				temp = nodeStats.cores;
				nodeStats = ns.hacknet.getNodeStats(i);
				ns.print("Node " + i + " upgraded Cores: " + temp + " -> " + nodeStats.cores);

				upgradeFlag = true;
				buyNode = false;
				//}
			} else {
				upgradeFlag = false;
			}
		}

		if (buyNode && availableMoney > costP) {
			availableMoney -= costP;
			ns.hacknet.purchaseNode();
			ns.print("A node has been purchased.");
			upgradeFlag = true;
		}

		if (upgradeFlag == false) {
			//if (ultimateMin == 0) {
			//timeElapsed += SECONDS;
			//} else {
			//if (debugMode) ns.print("ultimateMin: " + ultimateMin);
			//sec = ultimateMin / getNodeProduction(ns, totalNodes);
			//timeElapsed += sec;
			//}
		} else if (upgradeFlag == true) {
			//timeElapsed = 0;
			//sec = 1;
		}

		/*if (ultimateMin == 0) {
			ns.print("Sleeping for " + Math.round(SECONDS) + " seconds");
			await ns.sleep(SECONDS * 1000);
		} else {
			await findSleepTime(ns, sec);
		}*/
		//await findSleepTime(ns, timeElapsed);
		//await ns.sleep(timeElapsed * 1000);
		if (ns.getServerMoneyAvailable("home") < 10000000) {
			await findSleepTime(ns, SECONDS);
			await ns.sleep(SECONDS * 1000);
		} else if (ns.getServerMoneyAvailable("home") < 100000000) {
			await findSleepTime(ns, 30);
			await ns.sleep(30000);
		} else {
			await findSleepTime(ns, 10);
			await ns.sleep(10000);
		}


	}
	ns.tprint("'hacknet_v4_2.script' finished running.");
}
