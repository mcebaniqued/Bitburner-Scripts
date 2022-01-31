/** @param {NS} ns **/

let debugMode = false;

function findIndex(serverName, serverList) {
    //Returns index of the server name in serverList array
    for (let i = 0; i < serverList.length; i++) {
        if (serverList[i] == serverName) {
            return i;
        }
    }
    //Else return -1 if not found in serverName array
    return -1;
}

async function DFS(ns, currServer, target, serverList, visited, stack, path) {
    //Print current server name
    if (debugMode) {
        ns.tprint("-------------------------------------------------------------------");
        ns.tprint("Current Server: " + currServer);  //print the current server's name on terminal
        ns.tprint("Target Server:  " + target);
        //ns.tprint("Server List:    " + serverList);
        //ns.tprint("Visited:        " + visited);
        ns.tprint("Stack:          " + stack);
        ns.tprint("Path:           " + path);
        await ns.sleep(1);
    }

    //Base Case
    let allVisited = true;
    for (let i = 0; i < visited.length; i++) {    //check visited array if every node has been visited. return if all are yes
        if (visited[i] == false) {
            allVisited = false;
            break;
        }
    }
    if (allVisited && stack.length == 0) return; //if all servers have been visited and there's no server in stack, end DFS function


    //Mark current server as visited
    let tempIndex = findIndex(currServer, serverList);  //find where the name of server is in the visited bool array and mark as visited
    if (tempIndex != -1) {    //if found
        visited[tempIndex] = true;  //mark as true
    }   //if it is -1 then just continue with the code below (not in serverList == not visited)

    if (currServer == target) {
        path.push(target);
        return;
    }

    //Scan for all connected servers
    let tempArr = ns.scan(currServer);      //ns.scan(string: hostname) returns string array of server names connected to target server
    if (debugMode) {
        ns.tprint("Scanned Servers: " + tempArr);
        await ns.sleep(1);
    }

    //Add scanned server to serverList and stack arrays
    for (let i = 0; i < tempArr.length; i++) {
        let temp = findIndex(tempArr[i], serverList);  //check if the server is already in serverList array
        if (temp < 0) {  //if not in serverList
            serverList.push(tempArr[i]);    //push server name to list
            stack.push(tempArr[i]);        //push server name to stack
            visited.push(false);           //mark as not visited
        }
    }

    //Removes all the bought servers that was scanned from the stack
    let myServers = ns.getPurchasedServers();
    for (let i = 0; i < myServers.length; i++) {
        let index = findIndex(myServers[i], stack);
        if (index > 0) {
            stack.splice(index, 1);
        }
    }

    let tempCurr = stack[stack.length - 1];
    stack.pop();
    await ns.sleep(10);
    await DFS(ns, tempCurr, target, serverList, visited, stack, path);    //recursion

    let prevServer = path[path.length - 1];
    for (let i = 0; i < tempArr.length; i++) {
        if (tempArr[i] == prevServer) {
            path.push(currServer);
        }
    }

    if (debugMode) {
        ns.tprint("-------------------------------------------------------------------");
        ns.tprint("Current Server: " + currServer);
        ns.tprint("Scanned Servers: " + tempArr);
        ns.tprint("Updated Path:  " + path);
        await ns.sleep(10);
    }
}

export async function main(ns) {
    ns.disableLog("sleep");

    //1st argument of command line is the target server name
    let targetServer = ns.args[0];
    if (ns.serverExists(targetServer) == false) {
        ns.tprint("Server " + targetServer + " doesn't exist!");
        ns.tprint("findServer.js finished running");
        return;
    }

    //Save all servers found by DFS in an array
    let serverList = [];
    let visited = [];
    let stack = [];
    let path = [];

    //Start at home
    serverList.push("home");
    visited.push(false);
    await DFS(ns, "home", targetServer, serverList, visited, stack, path);

    //Print the path
    ns.tprint(path.reverse());
    ns.tprint("findServer.js finished running");
}

//TODO: implement arg[0] as server name
