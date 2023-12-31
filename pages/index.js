import Head from "next/head";
import { useEffect, useState } from "react";
import { BigNumber, ethers } from "ethers";
import abi from "../abi.json";
import Action from "components/components/action";
import PacmanLoader from "react-spinners/PacmanLoader";
import toast, { Toaster } from "react-hot-toast";
import {
  BiUser,
  BiSolidLogIn,
  BiLogoPaypal,
  BiMoneyWithdraw,
  BiMessageSquareDetail,
} from "react-icons/bi";

const Tabs = {
  REGISTER: "register",
  PAY: "pay",
  WITHDRAWL: "withdrawl",
  MESSAGES: "messages",
  ACCOUNT: "account",
};

const TabbedActions = ({ tabs, activeTab }) => {
  return (
    <div className="">
      {tabs.map((tab) => (
        <Action
          key={tab.name}
          className={` bg-white h-[80vh] p-6  ${
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
    <div className="flex flex-wrap justify-start">
      {buttons.map((button) => (
        <button
          key={button.label}
          className={`px-4 py-2 flex flex-row ${
            activeButton === button.label
              ? "bg-white text-indigo-600"
              : "bg-indigo-600 text-white"
          }`}
          onClick={() => button.onClick()}
        >
          <span className="hidden md:block">
            {button.label}
          </span>
          <span
            className={`${
              activeButton === button.label ? "text-indigo-600" : "text-white"
            } m-0 p-0 md:ml-2 flex pt-1`}
          >
            {button.label === Tabs.ACCOUNT && <BiUser />}
            {button.label === Tabs.REGISTER && <BiSolidLogIn />}
            {button.label === Tabs.PAY && <BiLogoPaypal />}
            {button.label === Tabs.WITHDRAWL && <BiMoneyWithdraw />}
            {button.label === Tabs.MESSAGES && <BiMessageSquareDetail />}
          </span>
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
    const fetchAllMessages = async () => {
      if (contract) {
        const totalMessagesCount = await contract.getMessagesCount();
        const allMessages = [];
        for (let i = 0; i < totalMessagesCount; i++) {
          const message = await contract.messages(i);
          allMessages.push({
            content: message.content,
            sender: message.sender,
            receiver: message.receiver,
          });
        }
        setMessages(allMessages);
      }
    };

    fetchAllMessages();

    const onMessageSend = async () => {
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
    onMessageSend();

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
        const connecting = async () => {
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
          const CashAppContract = new ethers.Contract(
            abi.address,
            abi.abi,
            pro
          );
          setContract(CashAppContract);

          //Signers CashTag and balance
          const cashTag = await CashAppContract.addressToCashtag(
            await sign.getAddress()
          );
          console.log(cashTag);
          const balance = await CashAppContract.balances(cashTag);
          const ether = BigNumber.from(balance);
          const eth = await ethers.utils.formatUnits(ether.toString(), 18);
          setAccountInfo({
            cashTag: cashTag,
            balance: eth,
            address: await sign.getAddress(),
          });
        };
        const wait = await toast.promise(connecting(), {
          loading: "Connecting to wallet",
          success: <b>Connection successful!</b>,
          error: <b>Connection failed.</b>,
        });
        console.log(wait);
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

      const tx = await toast.promise(CashAppWithSigner.register(register), {
        loading: "Confirming Transaction",
        error: <b>Transaction failed..</b>,
      });

      const wait = await toast.promise(tx.wait(), {
        loading: "Transaction Submitted.",
        success: <b>Transaction successful!</b>,
        error: <b>Transaction failed.</b>,
      });
      console.log(wait);
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

      const tx = await toast.promise(
        CashAppWithSigner.pay(to, from, message, { value: eth }),
        {
          loading: "Confirming Transaction",
          error: <b>Transaction failed..</b>,
        }
      );

      const wait = await toast.promise(tx.wait(), {
        loading: "Transaction Submitted.",
        success: <b>Transaction successful!</b>,
        error: <b>Transaction failed.</b>,
      });
      console.log(wait);
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
              <h2 className="pt-6 text-2xl font-bold text-gray-900">
                {accountInfo.cashTag.toUpperCase()}
              </h2>
              <div className="flex justify-center items-center">
                <p className="text-lg font-semibold">Balance:</p>
                <p className="text-lg font-semibold">
                  {accountInfo.balance} ETH
                </p>
              </div>
              <p className="truncate pt-2 text-sm text-gray-900 font-semibold">
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
            className="block w-full rounded-md border-gray-300 pl-2 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500"
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
            className="block w-full rounded-md border-gray-300 pl-2 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setTo(e.target.value)}
          />
          <input
            placeholder="From"
            className="block w-full rounded-md border-gray-300 pl-2 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            placeholder="Message"
            className="block w-full rounded-md border-gray-300 pl-2 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500"
            onChange={(e) => setMessage(e.target.value)}
          />
          <input
            placeholder="Amount"
            className="block w-full rounded-md border-gray-300 pl-2 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500"
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
            className="block w-full rounded-md border-gray-300 pl-2 shadow-sm mb-4 focus:ring-indigo-500 focus:border-indigo-500"
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
          <div className="w-full flex flex-wrap overflow-y-scroll h-[93%]">
            {messages?.map((i, index) => (
              <div
                key={index}
                className="z-0 flex w-full border flex-col items-center p-4 mb-4 bg-gray-50 rounded-lg shadow "
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
          <div className="">
            <h1 className="py-3 px-4 text-4xl font-bold bg-indigo-600 text-white">
              Base Cash
            </h1>
          </div>
          <div className="pt-3 py-auto">
            <Toaster position="bottom-right" />
            {!loading ? (
              <div className="w-[90%] mt-4  md:max-w-[73%] lg:max-w-[50%] m-auto">
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

// Depth-First Search and Breadth-First Search
