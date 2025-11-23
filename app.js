<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compound Market Data Viewer</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Load Handlebars for Templating -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.min.js"></script>
    <!-- Load Web3.js -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/web3/1.8.1/web3.min.js"></script>
    
    <style>
        /* Custom Styles and Font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f7f7f7;
            color: #1f2937;
        }
        .table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px; /* Spacing between rows */
        }
        .table th, .table td {
            padding: 12px 16px;
            text-align: left;
            border: none;
        }
        .table thead th {
            background-color: #e5e7eb;
            font-weight: 600;
            color: #374151;
            border-radius: 6px 6px 0 0;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .table tbody tr {
            background-color: white;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            transition: all 0.2s;
            border-radius: 8px;
        }
        .table tbody tr:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }
        .table tbody td:first-child, .table thead th:first-child { border-radius: 8px 0 0 8px; }
        .table tbody td:last-child, .table thead th:last-child { border-radius: 0 8px 8px 0; }

        /* Loader */
        .loader {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4f46e5;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="p-4 md:p-8">

    <!-- Global Variables & Mock Data (MUST BE AVAILABLE IN THE WINDOW SCOPE) -->
    <script>
        // NOTE: In a real environment, this data would be loaded from a separate file or backend.
        // For this demo, we provide mock ABIs and structure data.
        window.protocolData = {
            mainnet: {
                comptroller: "0x3d9819210a31b402932aa650586e085a9c2e733b",
                cTokens: [
                    { name: "cETH", symbol: "cETH", token_address: "0x4ddc2d1939c258190e72d28f3a3c9e2b62ae3be5" },
                    { name: "cDAI", symbol: "cDAI", token_address: "0x5d3a536e4d5469493a1523414cd77d2afbc0c322" }
                ]
            }
        };

        // Minimal mock ABIs (only including methods used in the script)
        window.erc20cTokenAbi = [
            {"constant":true,"inputs":[],"name":"exchangeRateCurrent","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"getCash","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"totalBorrowsCurrent","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"borrowRatePerBlock","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"supplyRatePerBlock","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"totalReserves","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"reserveFactorMantissa","outputs":[{"name":"","type":"uint256"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"},
            {"constant":true,"inputs":[],"name":"underlying","outputs":[{"name":"","type":"address"}],"type":"function"}
        ];
        window.comptrollerAbi = [
            {"constant":true,"inputs":[{"name":"","type":"address"}],"name":"markets","outputs":[{"name":"isListed","type":"bool"},{"name":"collateralFactorMantissa","type":"uint256"},{"name":"isComped","type":"bool"}],"type":"function"}
        ];
    </script>

    <div class="flex flex-col md:flex-row gap-8">
        <!-- Navigation / Sidebar -->
        <div class="w-full md:w-1/4 p-4 bg-white rounded-xl shadow-lg h-full sticky top-4 mb-4 md:mb-0">
            <h1 class="text-2xl font-bold mb-4 text-indigo-700">Market Dashboard</h1>
            <p class="text-sm text-gray-500 mb-4">Jump to Asset:</p>
            <div id="navigation" class="flex flex-col space-y-1">
                <!-- Navigation links will be injected here -->
            </div>
            <button id="scroll-top" class="mt-6 w-full py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition duration-150 shadow-md">
                Scroll to Top
            </button>
        </div>

        <!-- Main Content -->
        <div id="networks-container" class="w-full md:w-3/4">
            <div class="flex justify-center items-center h-40">
                <div class="loader"></div>
                <p class="ml-4 text-gray-600">Loading networks and assets...</p>
            </div>
            <!-- Network containers will be injected here -->
        </div>
    </div>

    <!-- JavaScript Logic -->
    <script>
        // Global Constants
        const protocolData = window.protocolData;
        const erc20cTokenAbi = window.erc20cTokenAbi;
        const comptrollerAbi = window.comptrollerAbi;
        const networks = Object.keys(protocolData);
        // NOTE: Hardcoding API keys in client-side code is a security risk. 
        // This is done here for demo purposes only.
        const infuraApiKey = '7db01e82204d4e789e22cf8e4f640ebe'; 
        
        // --- Utility Functions ---
        
        // Custom Number Formatter (using a consistent max precision)
        const numbFormat = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 6 // Reduced max precision for readability
        }).format;
        
        // Handlebars Templates (defined globally for convenience)
        const tableTemplate = Handlebars.compile(`
            <div id="{{ network }}-{{ symbol }}" class="w-full bg-white p-6 rounded-xl shadow-lg mb-8">
                <h3 class="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">{{ name }} ({{ symbol }})</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th class="rounded-l-lg">Attribute Name</th>
                            <th>Value (Formatted)</th>
                            <th>Raw Member Name</th>
                            <th class="rounded-r-lg">Raw Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Current Exchange Rate</td>
                            <td class="font-mono text-sm text-indigo-600">{{ textExchangeRate }}</td>
                            <td>exchangeRateCurrent</td>
                            <td class="font-mono text-xs">{{ exchangeRateCurrent }}</td>
                        </tr>
                        <tr>
                            <td>Contract Holdings</td>
                            <td class="font-mono text-sm">{{ textContractHoldings }}</td>
                            <td>getCash</td>
                            <td class="font-mono text-xs">{{ liquidityPoolTotal }}</td>
                        </tr>
                        <tr>
                            <td>Open Borrows Sum</td>
                            <td class="font-mono text-sm">{{ textOpenBorrows }}</td>
                            <td>totalBorrowsCurrent</td>
                            <td class="font-mono text-xs">{{ totalBorrowsCurrent }}</td>
                        </tr>
                        <tr>
                            <td>Supply Rate / Block</td>
                            <td class="font-mono text-sm">{{ textSupplyRate }}</td>
                            <td>supplyRatePerBlock</td>
                            <td class="font-mono text-xs">{{ supplyRatePerBlock }}</td>
                        </tr>
                        <tr>
                            <td>Borrow Rate / Block</td>
                            <td class="font-mono text-sm">{{ textBorrowRate }}</td>
                            <td>borrowRatePerBlock</td>
                            <td class="font-mono text-xs">{{ borrowRatePerBlock }}</td>
                        </tr>
                        <tr>
                            <td>cTokens in Circulation</td>
                            <td class="font-mono text-sm text-green-600">{{ textCTokenCirculation }}</td>
                            <td>totalSupply</td>
                            <td class="font-mono text-xs">{{ totalSupply }} / 1e{{ cTokenDecimals }}</td>
                        </tr>
                        <tr>
                            <td>Total Reserves</td>
                            <td class="font-mono text-sm">{{ textReservesSum }}</td>
                            <td>totalReserves</td>
                            <td class="font-mono text-xs">{{ totalReserves }}</td>
                        </tr>
                        <tr>
                            <td>Reserve Factor</td>
                            <td class="font-mono text-sm font-bold text-red-600">{{ textReserveFactor }}</td>
                            <td>reserveFactorMantissa</td>
                            <td class="font-mono text-xs">{{ reserveFactor }}</td>
                        </tr>
                        <tr>
                            <td>Collateral Factor</td>
                            <td class="font-mono text-sm font-bold text-teal-600">{{ textCollateralFactor }}</td>
                            <td>comptroller.markets</td>
                            <td class="font-mono text-xs">{{ collateralFactor.collateralFactorMantissa }}</td>
                        </tr>
                        <tr>
                            <td>Underlying Address</td>
                            <td colspan="3" class="font-mono text-sm">{{ underlyingAddress }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `);

        const networkTemplate = Handlebars.compile(`
            <h2 id="{{ this }}" class="capitalize text-3xl font-bold mt-8 mb-4 text-gray-700">{{ this }} Network</h2>
            <div id="container-{{ this }}" class="space-y-6">
                <!-- Asset tables will be placed here -->
            </div>
        `);
        
        const errorTemplate = Handlebars.compile(`
            <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <strong class="font-bold">Error loading {{ name }} ({{ symbol }})</strong>
                <span class="block sm:inline">{{ errorMessage }}</span>
            </div>
        `);
        
        // Global web3 instance storage, keyed by network name, to avoid reinitialization.
        const web3Instances = {};

        /**
         * Fetches all required on-chain data for a specific cToken.
         * @param {string} network - The network name (e.g., 'mainnet').
         * @param {string} cTokenAddr - The address of the cToken.
         * @param {string} comptrollerAddr - The address of the Comptroller.
         * @param {string} symbol - The symbol of the cToken (e.g., 'cETH').
         */
        const getCTokenData = async (network, cTokenAddr, comptrollerAddr, symbol) => {
            // Initialize Web3 instance once per network if not already done
            if (!web3Instances[network]) {
                const providerUrl = `https://${network}.infura.io/v3/${infuraApiKey}`;
                web3Instances[network] = new Web3(providerUrl);
            }
            const web3 = web3Instances[network];

            const cToken = new web3.eth.Contract(erc20cTokenAbi, cTokenAddr);
            const comptroller = new web3.eth.Contract(comptrollerAbi, comptrollerAddr);
            
            // --- Fetching Data ---
            const [
                exchangeRateCurrent,
                liquidityPoolTotal,
                totalBorrowsCurrent,
                borrowRatePerBlock,
                totalSupply,
                supplyRatePerBlock,
                totalReserves,
                reserveFactor,
                collateralFactorRaw,
                cTokenDecimals,
                underlyingAddress,
            ] = await Promise.all([
                cToken.methods.exchangeRateCurrent().call(),
                cToken.methods.getCash().call(),
                cToken.methods.totalBorrowsCurrent().call(),
                cToken.methods.borrowRatePerBlock().call(),
                cToken.methods.totalSupply().call(),
                cToken.methods.supplyRatePerBlock().call(),
                cToken.methods.totalReserves().call(),
                cToken.methods.reserveFactorMantissa().call(),
                comptroller.methods.markets(cTokenAddr).call(),
                cToken.methods.decimals().call(),
                cToken.methods.underlying().call(),
            ]);

            // --- Formatting and Calculations ---
            
            // Assuming underlying tokens have 18 decimals for simple conversion (needs verification per token)
            const underlyingDecimals = 18; 
            const mantissaFactor = Math.pow(10, 18); // 1e18

            // Convert BigInt strings to BigInt objects for accurate scaling, then to float for formatting
            const exchangeRate = parseFloat(exchangeRateCurrent) / mantissaFactor;
            const underlyingScale = Math.pow(10, underlyingDecimals);
            
            // Exchange Rate Calculation: (ExchangeRate / 1e18) / (1e(18 - cTokenDecimals))
            const scaledExchangeRate = exchangeRate / Math.pow(10, 18 - cTokenDecimals); 
            
            // The Compound protocol uses 1e18 for rates and factors, and underlying token decimals for amounts.
            // Since we don't fetch underlying token decimals, we assume 18 for display consistency, 
            // but log the cTokenDecimals for transparency.

            const result = {
                network,
                symbol,
                exchangeRateCurrent,
                liquidityPoolTotal,
                totalBorrowsCurrent,
                borrowRatePerBlock,
                totalSupply,
                supplyRatePerBlock,
                totalReserves,
                reserveFactor: reserveFactor,
                collateralFactor: collateralFactorRaw,
                cTokenDecimals,
                underlyingAddress,

                // Formatted Text Outputs
                textExchangeRate: `1 c${symbol} = ${numbFormat(scaledExchangeRate)} underlying`,
                textContractHoldings: `${numbFormat(parseFloat(liquidityPoolTotal) / underlyingScale)} underlying`,
                textOpenBorrows: `${numbFormat(parseFloat(totalBorrowsCurrent) / underlyingScale)} underlying`,
                
                // Rate Mantissa (1e18) to Percentage
                textSupplyRate: `${(parseFloat(supplyRatePerBlock) / mantissaFactor).toFixed(18)} per Block`,
                textBorrowRate: `${(parseFloat(borrowRatePerBlock) / mantissaFactor).toFixed(18)} per Block`,
                
                // Total Supply (scaled by cToken decimals)
                textCTokenCirculation: `${numbFormat(parseFloat(totalSupply) / Math.pow(10, cTokenDecimals))} c${symbol}`,
                
                // Reserves, Factors
                textReservesSum: `${numbFormat(parseFloat(totalReserves) / underlyingScale)} underlying`,
                textReserveFactor: `${numbFormat(parseFloat(reserveFactor) / mantissaFactor * 100)}%`,
                textCollateralFactor: `${numbFormat(parseFloat(collateralFactorRaw.collateralFactorMantissa) / mantissaFactor * 100)}%`,
            };

            return result;
        };

        // --- Main Application Flow ---

        const runApplication = async () => {
            const networksContainer = document.getElementById('networks-container');
            const navigation = document.getElementById('navigation');
            
            // Clear initial loading message
            networksContainer.innerHTML = ''; 

            if (networks.length === 0) {
                 networksContainer.innerHTML = `<p class="text-xl text-red-500 p-8">Error: protocolData is empty or missing.</p>`;
                 return;
            }

            for (const net of networks) {
                // 1. Render Network Header
                networksContainer.innerHTML += networkTemplate(net);
                const tablesContainer = document.getElementById(`container-${net}`);
                
                const cTokens = protocolData[net].cTokens;

                if (cTokens.length === 0) {
                    tablesContainer.innerHTML = `<p class="text-lg text-gray-500 p-4">No cTokens configured for ${net}.</p>`;
                    continue;
                }

                const comptrollerAddr = protocolData[net].comptroller;
                
                // 2. Process cTokens sequentially for stability
                for (const cToken of cTokens) {
                    const cTokenAddr = cToken.token_address;
                    const symbol = cToken.symbol;
                    const id = `${net}-${symbol}`;
                    
                    // Add temporary loading element for the asset
                    tablesContainer.innerHTML += `<div id="${id}" class="loading-element flex justify-center items-center h-20 mb-8"><div class="loader"></div></div>`;
                    const loadingElement = document.getElementById(id);


                    try {
                        const data = await getCTokenData(net, cTokenAddr, comptrollerAddr, symbol);
                        data.name = cToken.name;
                        
                        // Success: Replace loading element with the populated table
                        loadingElement.outerHTML = tableTemplate(data);

                        // 3. Update Navigation
                        const nav = document.createElement("A");
                        nav.href = `#${id}`;
                        nav.innerText = `${net} - ${symbol}`;
                        nav.className = "text-sm text-gray-600 hover:text-indigo-500 transition duration-150 py-1";
                        navigation.appendChild(nav);
                        
                    } catch (e) {
                        console.error(`Error fetching data for ${net} - ${symbol}:`, e);
                        // Failure: Replace loading element with error message
                        const errorData = {
                            name: cToken.name,
                            symbol: symbol,
                            errorMessage: e.message || "Unknown error during RPC call or data processing."
                        };
                        loadingElement.outerHTML = errorTemplate(errorData);
                    }
                }
            }
        };

        // Initialize Scroll Top button
        const scrollTop = document.getElementById('scroll-top');
        scrollTop.onclick = () => { window.scrollTo({ top: 0, behavior: 'smooth' }) };

        // Start application on window load
        window.addEventListener('load', runApplication);
    </script>
</body>
</html>
