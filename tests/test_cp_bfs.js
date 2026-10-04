import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { resetEngineState, runProgram } from '../src/core/interpreter.js';

const cpCode = `#include <bits/stdc++.h>
using namespace std;

using ll = long long;
using vi = vector<int>;
using vll = vector<ll>;
#define all(x) (x).begin(), (x).end()
#define sz(x) ((int)(x).size())

void setIO(string name = "") {
	if (name.size()) {
		freopen((name + ".in").c_str(), "r", stdin);
		freopen((name + ".out").c_str(), "w", stdout);
	}
}

void solve() {
    int n,m;
    cin>>n>>m;
    
    vector<vector<int>>adj(n+1);
    vector<bool>visited(n+1,false);
    vector<int>parent(n+1,0);
    queue<int>q;
    
    for(int i=0;i<m;i++){
        int a,b;
        cin>>a>>b;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    
    visited[1]=true;
    q.push(1);
    
    while(!q.empty()){
        
        int u = q.front();
        q.pop();
        
        if(u==n)break;
        
        for(int x:adj[u]){
            if(!visited[x]){
                visited[x]=true;
                parent[x]=u;
                q.push(x);
            }
        }
    }

    if(!visited[n]){
        cout<<"IMPOSSIBLE"<<endl;
        return;
    }
    vector<int>path;
    for(int count=n;count!=0;count=parent[count]){
        path.push_back(count);
    }
    
    reverse(all(path));
    
    cout<<path.size()<<"\\n";
    
    for(int i=0;i<path.size();i++){
        cout<<path[i]<<" ";
    }
    cout<<"\\n";
}

int main() {
	ios_base::sync_with_stdio(false);
	cin.tie(NULL);

	int t = 1;
	while (t--) {
		solve();
	}
	return 0;
}`;

console.log('[TEST] Testing CP BFS code parsing & execution...');
try {
  const tokens = tokenize(cpCode);
  console.log('[PASS] Tokenized tokens count:', tokens.length);
  const ast = parseProgram(tokens);
  console.log('[PASS] Parsed AST functions:', Object.keys(ast.functions));
  resetEngineState();
  const graphInput = '5 5  1 2  2 3  3 4  4 5  1 5';
  const timeline = runProgram(ast.functions.main, [], ast.functions, graphInput);
  console.log('[PASS] Execution successful! Steps:', timeline.length);
  const lastStep = timeline[timeline.length - 1];
  console.log('[INFO] Final step action:', lastStep.explanation);
} catch (err) {
  console.error('[FAIL] Error:', err.message, 'at line', err.line);
}
