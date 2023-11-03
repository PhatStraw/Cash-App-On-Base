import Head from "next/head";
import { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";
import abi from "../abi.json";
import Action from "components/components/action";
import PacmanLoader from "react-spinners/PacmanLoader";
const Tabs = {
  REGISTER: "register",
  PAY: "pay",
  WITHDRAWL: "withdrawl",
  MESSAGES: "messages",
  ACCOUNT: "account",
};

const override = {
  display: "block",
  margin: "0 auto",
  borderColor: "red",
};

const TabbedActions = ({ tabs, activeTab }) => {
  return (
    <div className="min-h-[50vh]">
      {tabs.map((tab) => (
        <Action
          key={tab.name}
          className={`mt-2 bg-white p-6 rounded-lg shadow-lg min-h-[50vh] ${
            activeTab === tab.name ? "block" : "hidden"
          }`}
        >
          {tab.component}
        </Action>
      ))}
    </div>
  );
};

const TabButtons = ({ buttons, activeButton }) => {
  return (
    <div className="flex flex-wrap justify-center">
      {buttons.map((button) => (
        <button
          key={button.label}
          className={`px-4  m-1 py-2 rounded-lg ${
            activeButton === button.label
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-600"
          }`}
          onClick={() => button.onClick()}
        >
          {button.label}
        </button>
      ))}
    </div>
  );
};

export default function Home() {
  const [activeButton, setActiveButton] = useState(Tabs.REGISTER);
  const [activeTab, setActiveTab] = useState(Tabs.REGISTER);
  const [signer, setSigner] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [register, setRegister] = useState();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [to, setTo] = useState();
  const [from, setFrom] = useState();
  const [amount, setAmount] = useState();
  const [withdrawl, setWithdrawl] = useState();
  const [network, setNetwork] = useState();
  const [accountInfo, setAccountInfo] = useState(null);
  const liveNetwork = process.env.NETWORK_ID || 84531;

  //   //Track MessageSent Events
  useEffect(() => {
    const trythis = async () => {
      if (contract) {
        contract.on("MessageSent", (content, sender, receiver) => {
          console.log(`${sender} sent ${content} to ${receiver}`);
          setMessages((prevMessages) => [
            ...prevMessages,
            { content, sender, receiver },
          ]);
        });
      }
    };
    trythis();
    return () => {
      if (contract) {
        contract.removeAllListeners();
      }
    };
  }, [contract]);

  //   //Track network changes
  useEffect(() => {
    const externalProvider = window.ethereum; // Your existing Web3-compatible provider
    const provider = new ethers.providers.Web3Provider(externalProvider);

    provider.on("network", (newNetwork, oldNetwork) => {
      if (!oldNetwork && newNetwork.chainId !== 84531) {
        alert("APP WILL NOT WORK: Change Your Network TO Base GOERLI");
      }
      if (oldNetwork) {
        // Network has changed, refresh the page to reset UI components
        window.location.reload();
      }
    });

    // Clean up the event listener when the component unmounts
    return () => {
      provider.off("network");
    };
  }, []);

  const connectWallet = async () => {
    setLoading(true);
    if (window.ethereum == null) {
      // If MetaMask is not installed, we use the default provider,
      // which is backed by a variety of third-party services (such
      // as INFURA). They do not have private keys installed so are
      // only have read-only access
      alert("MetaMask not installed; using read-only defaults");
      console.log("MetaMask not installed; using read-only defaults");
      const pro = ethers.getDefaultProvider();
      setProvider(pro);
      setLoading(false);
    } else {
      try {
        // A Web3Provider wraps a standard Web3 provider, which is
        // what MetaMask injects as window.ethereum into each page
        const pro = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(pro);
        const { chainId } = await pro.getNetwork();
        setNetwork(chainId);
        // MetaMask requires requesting permission to connect users accounts
        await pro.send("eth_requestAccounts", []);

        // The MetaMask plugin also allows signing transactions to
        // send ether and pay to change state within the blockchain.
        // For this, you need the account signer...
        const sign = pro.getSigner();
        setSigner(sign);

        // The Contract object
        const CashAppContract = new ethers.Contract(abi.address, abi.abi, pro);
        setContract(CashAppContract);
        console.log;
        //Last Message Sent
        const messy = await CashAppContract.messages("0");
        setMessages((prevMessages) => [
          ...prevMessages,
          { content: messy[0], sender: messy[1], receiver: messy[2] },
        ]);

        //Signers CashTag and balance
        const cashTag = await CashAppContract.addressToCashtag(
          await sign.getAddress()
        );
        const balance = await CashAppContract.balances(cashTag);
        const ether = BigNumber.from(balance);
        const eth = await ethers.utils.formatUnits(ether.toString(), 18);
        setAccountInfo({
          cashTag: cashTag,
          balance: eth,
          address: await sign.getAddress(),
        });
      } catch (error) {
        console.log(error);
        alert(error);
      }
      setLoading(false);
    }
  };

  const onRegister = async () => {
    if (register) {
      // Contract is currently connected to the Provider,
      // which is read-only. You need to connect to a Signer, so
      // that you can pay to send state-changing transactions.
      const CashAppWithSigner = await contract.connect(signer);

      const tx = await CashAppWithSigner.register(register);
      setLoading(true);
      const wait = await tx.wait();
      console.log(wait);
      setLoading(false);
    }
  };

  const onPay = async () => {
    if (to && message) {
      // Contract is currently connected to the Provider,
      // which is read-only. You need to connect to a Signer, so
      // that you can pay to send state-changing transactions.
      const CashAppWithSigner = await contract.connect(signer);

      // Eth has 18 decimal places
      const eth = ethers.utils.parseUnits(amount, 18);

      const tx = await CashAppWithSigner.pay(to, from, message, { value: eth });
      setLoading(true);
      const wait = await tx.wait();
      console.log(wait);
      setLoading(false);
    }
  };

  const onWithdrawl = async () => {
    // try{
    if (withdrawl) {
      const CashAppWithSigner = await contract.connect(signer);
      const tx = await CashAppWithSigner.withdrawl(withdrawl);
      setLoading(true);
      const wait = await tx.wait();
      setLoading(false);
    }
  };

  const buttons = [
    {
      label: Tabs.ACCOUNT,
      onClick: () => {
        setActiveTab(Tabs.ACCOUNT);
        setActiveButton(Tabs.ACCOUNT);
      },
    },
    {
      label: Tabs.REGISTER,
      onClick: () => {
        setActiveTab(Tabs.REGISTER);
        setActiveButton(Tabs.REGISTER);
      },
    },
    {
      label: Tabs.PAY,
      onClick: () => {
        setActiveTab(Tabs.PAY);
        setActiveButton(Tabs.PAY);
      },
    },
    {
      label: Tabs.WITHDRAWL,
      onClick: () => {
        setActiveTab(Tabs.WITHDRAWL);
        setActiveButton(Tabs.WITHDRAWL);
      },
    },
    {
      label: Tabs.MESSAGES,
      onClick: () => {
        setActiveTab(Tabs.MESSAGES);
        setActiveButton(Tabs.MESSAGES);
      },
    },
  ];

  const tabs = [
    {
      name: Tabs.ACCOUNT,
      component: (
        <div className="text-center ">
          <h1 className="pt-3 text-4xl font-bold text-indigo-600 text-center pb-4">
            Account
          </h1>
          {accountInfo && (
            <>
              <h2 className="pt-6 text-3xl text-gray-900">
                CASH TAG <br></br>
                {accountInfo.cashTag}
              </h2>
              <p className="pt-2 text-sm text-gray-900">
                Balance: {accountInfo.balance}E
              </p>
              <p className="pt-2 text-sm text-gray-900">
                Wallet Address: {accountInfo.address}
              </p>
            </>
          )}
        </div>
      ),
    },
    {
      name: Tabs.REGISTER,
      component: (
        <>
          <h1 className="pt-3 text-4xl font-bold text-indigo-600 text-center pb-4">
            Register
          </h1>
          <input
            type="text"
            name="register"
            id="register"
            className="block w-full rounded-md border-gray-300 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Register a CashTag"
            onChange={(e) => setRegister(e.target.value)}
          />
          <button
            onClick={onRegister}
            className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700 transition duration-300"
          >
            Register
          </button>
        </>
      ),
    },
    {
      name: Tabs.PAY,
      component: (
        <>
          <h1 className="pt-3 text-4xl font-bold text-indigo-600 text-center pb-4">
            Pay
          </h1>
          <input
            placeholder="To"
            className="block w-full rounded-md border-gray-300 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            onChange={(e) => setTo(e.target.value)}
          />
          <input
            placeholder="From"
            className="block w-full rounded-md border-gray-300 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            placeholder="Message"
            className="block w-full rounded-md border-gray-300 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            placeholder="Amount"
            className="block w-full rounded-md border-gray-300 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            onClick={onPay}
            className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700 transition duration-300"
          >
            Click2Pay
          </button>
        </>
      ),
    },
    {
      name: Tabs.WITHDRAWL,
      component: (
        <>
          <h1 className="pt-3 text-4xl font-bold text-indigo-600 text-center pb-4">
            Withdrawl
          </h1>

          <input
            placeholder="Withdrawl From A CashTag You Own"
            className="block w-full rounded-md border-gray-300 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            onChange={(e) => setWithdrawl(e.target.value)}
          />
          <button
            onClick={onWithdrawl}
            className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700 transition duration-300"
          >
            Click2Withdrawl
          </button>
        </>
      ),
    },
    {
      name: Tabs.MESSAGES,
      component: (
        <>
          <h1 className="pt-3 text-4xl font-bold text-indigo-600 text-center pb-4">
            Messages
          </h1>
          <div className="w-full flex flex-wrap">
            {messages?.map((i, index) => (
              <div
                key={index}
                className="overflow-auto flex w-full border flex-col items-center p-4 mb-4 bg-gray-50 rounded-lg shadow "
              >
                <h3 className="border-b border-b-gray-200 w-full pb-2 mb-2 text-center font-semibold">
                  Message #{index + 1}
                </h3>
                <div>Sender:&nbsp;{i.sender}</div>
                <div>Reciever:&nbsp;{i.receiver}</div>
                <div>Message:&nbsp;{i.content}</div>
              </div>
            ))}
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Decentralized Cash App</title>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css"
          rel="stylesheet"
        />
      </Head>
      {network === liveNetwork ? (
        <div className="mx-auto p-0">
          <div className="text-center">
            <h1 className="py-3 text-4xl font-bold bg-indigo-600 text-white">
              Cash App on Base
            </h1>
          </div>
          <div className="pt-3 py-auto">
            {!loading ? (
              <div className="w-[100%] md:max-w-[70%] lg:max-w-[50%] m-auto">
                <TabButtons buttons={buttons} activeButton={activeButton} />
                <TabbedActions activeTab={activeTab} tabs={tabs} />
              </div>
            ) : (
              <div className="flex justify-center itemss-center w-full">
                <PacmanLoader size={120} color="fuchsia" />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <p className="text-xl font-bold">
              Connect to Base GOERLI to Continue
            </p>
            <button
              onClick={connectWallet}
              className="w-full bg-indigo-600 text-white p-3 rounded hover:bg-indigo-700 transition duration-300"
            >
              Connect to MetaMask
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
