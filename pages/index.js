import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { BigNumber, ethers } from 'ethers'
import abi from "../abi.json"
import logo from "../public/logo.png"
import Action from 'components/components/action'
export default function Home() {
  const [signer, setSigner] = useState(null)
  const [provider, setProvider] = useState(null)
  const [contract, setContract] = useState(null)
  const [register, setRegister] = useState()
  const [loading, setLoading] = useState(false)
  const [cashTag, setCashTag] = useState()
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState()
  const [to, setTo] = useState()
  const [from, setFrom] = useState()
  const [amount, setAmount] = useState()
  const [withdrawl, setWithdrawl] = useState()
  const [balance, setBalance] = useState()
  const [network, setNetwork] = useState()
  const liveNetwork = process.env.NETWORK_ID || 84531
  //Connect Wallet
  useEffect(() => {
    const connectWallet = async () => {
      setLoading(true)
      if (window.ethereum == null) {
        // If MetaMask is not installed, we use the default provider,
        // which is backed by a variety of third-party services (such
        // as INFURA). They do not have private keys installed so are
        // only have read-only access
        alert("MetaMask not installed; using read-only defaults")
        console.log("MetaMask not installed; using read-only defaults")
        const pro = ethers.getDefaultProvider()
        setProvider(pro)
        setLoading(false)
      } else {
        try {
          // A Web3Provider wraps a standard Web3 provider, which is
          // what MetaMask injects as window.ethereum into each page
          const pro = new ethers.providers.Web3Provider(window.ethereum)
          setProvider(pro)
          const { chainId } = await pro.getNetwork()
          setNetwork(chainId)
          // MetaMask requires requesting permission to connect users accounts
          await pro.send("eth_requestAccounts", []);

          // The MetaMask plugin also allows signing transactions to
          // send ether and pay to change state within the blockchain.
          // For this, you need the account signer...
          const sign = pro.getSigner()
          setSigner(sign)

          // The Contract object
          const CashAppContract = new ethers.Contract(abi.address, abi.abi, pro)
          setContract(CashAppContract)
          console.log
          //Last Message Sent
          const messy = await CashAppContract.messages("0")
          setMessages((prevMessages) => [...prevMessages, { content: messy[0], sender: messy[1], receiver: messy[2] }])

          //Signers CashTag and balance
          const cashTag = await CashAppContract.addressToCashtag(await sign.getAddress())
          const balance = await CashAppContract.balances(cashTag)
          const ether = BigNumber.from(balance)
          const eth = await ethers.utils.formatUnits(ether.toString(), 18);
          setBalance(eth)
          setCashTag(cashTag)
        } catch (error) {
          console.log(error)
          alert(error)
        }
        setLoading(false)
        // Clean up the event listener when the component unmounts
        // return () => {
        //   provider.off("network");
        // };
      }
    }
    connectWallet()
  }, [])

  //Track MessageSent Events
  useEffect(() => {
    const trythis = async () => {
      if (contract) {
        contract.on("MessageSent", (content, sender, receiver) => {
          console.log(`${sender} sent ${content} to ${receiver}`);
          setMessages((prevMessages) => [...prevMessages, { content, sender, receiver }])
        });
      }
    }
    trythis()
    return () => {
      if (contract) {
        contract.removeAllListeners();
      }
    };
  }, [contract]);

  //Track network changes
  useEffect(() => {
    const externalProvider = window.ethereum; // Your existing Web3-compatible provider
    const provider = new ethers.providers.Web3Provider(externalProvider);

    provider.on("network", (newNetwork, oldNetwork) => {
      if (!oldNetwork && newNetwork.chainId !== 84531) {
        alert("APP WILL NOT WORK: Change Your Network TO Base GOERLI")
      }
      if (oldNetwork) {
        // Network has changed, refresh the page to reset UI components
        window.location.reload();
      }
    });

    // Your existing code...

    // Clean up the event listener when the component unmounts
    return () => {
      provider.off("network");
    };
  }, []);

  const onRegister = async () => {
    if (register) {
      // Contract is currently connected to the Provider,
      // which is read-only. You need to connect to a Signer, so
      // that you can pay to send state-changing transactions.
      const CashAppWithSigner = await contract.connect(signer);

      const tx = await CashAppWithSigner.register(register);
      setLoading(true)
      const wait = await tx.wait()
      console.log(wait)
      setLoading(false)
    }
  }

  const onPay = async () => {
    if (to && message) {
      // Contract is currently connected to the Provider,
      // which is read-only. You need to connect to a Signer, so
      // that you can pay to send state-changing transactions.
      const CashAppWithSigner = await contract.connect(signer);

      // Eth has 18 decimal places
      const eth = ethers.utils.parseUnits(amount, 18);

      const tx = await CashAppWithSigner.pay(to, from, message, { value: eth });
      setLoading(true)
      const wait = await tx.wait()
      console.log(wait)
      setLoading(false)
    }
  }

  const onWithdrawl = async () => {
// try{    
  if (withdrawl) {
      const CashAppWithSigner = await contract.connect(signer);
      const tx = await CashAppWithSigner.withdrawl(withdrawl);
      setLoading(true)
      const wait = await tx.wait()
      console.log(wait)
      setLoading(false)
    }
//   }catch(err){
// console.log("here",err)
//     }
  }

  return (
    <div className='pt-10'>
      {network === liveNetwork ?
      <div>
        <div className='flex flex-col items-center justify-center'>
          <Image key="logo" alt="Pic of logo" src={logo} />
          <div>
            {cashTag ? `Cash Tag: ${cashTag}` : "No CashTag Found For This Wallet"}
          </div>
          <div>
            {balance ? `Balance: ${balance}E` : "No Balance Found For This Wallet"}
          </div>
        </div>
      {!loading ?
        <div className='grid sm:grid-cols-1 md:grid-cols-2 justify-items-center w-full md:px-[10rem]'>
          <Action>
            <h3 className='text-3xl align-center'>Register</h3>
            <input
              type="text"
              name="register"
              id="register"
              className="block w-full rounded-md border-0 py-1.5 pl-7 m-1 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Register a CashTag"
              onChange={e => setRegister(e.target.value)}
            />
            <button onClick={onRegister} className='bg-black text-white p-4 mt-2' >Click2Register</button>
          </Action>
          <Action>
            <h3 className='text-3xl align-center'>Pay</h3>

            <input placeholder='To'
              className="block w-full rounded-md border-0 py-1.5 pl-7 m-1 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              onChange={e => setTo(e.target.value)} />
            <input placeholder='From'
              className="block w-full rounded-md border-0 py-1.5 pl-7 m-1 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              onChange={e => setFrom(e.target.value)} />
            <input placeholder='Message'
              className="block w-full rounded-md border-0 py-1.5 pl-7 m-1 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              onChange={e => setMessage(e.target.value)} />
            <input placeholder='Amount'
              className="block w-full rounded-md border-0 py-1.5 pl-7 m-1 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              onChange={e => setAmount(e.target.value)} />
            <button onClick={onPay} className='bg-black text-white p-4 mt-2' >Click2Pay</button>
          </Action>
          <Action>
            <h3 className='text-3xl align-center'>Withdrawl</h3>
            <input placeholder='Withdrawl From A CashTag You Own'
              className="block w-full rounded-md border-0 py-1.5 pl-7 m-1 pr-20 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              onChange={e => setWithdrawl(e.target.value)} />
            <button onClick={onWithdrawl} className='bg-black text-white p-4 mt-2' >Click2Withdrawl</button>
          </Action>
          <Action>
            <h3 className='text-3xl align-center'>Messages</h3>
            <div className='w-full flex flex-wrap    '>
              {messages?.map((i) => (
                <div key={i.sender} className='flex w-1/2 border flex-col items-center'>
                  <h3 className='border-b border-b-black'>MESSAGE</h3>
                  <div>Sender:&nbsp;{i.sender}</div>
                  <div>Reciever:&nbsp;{i.receiver}</div>
                  <div>Message:&nbsp;{i.content}</div>
                </div>
              ))}
            </div>
          </Action>
        </div> : <div className='text-center flex justify-center items-center'>transactions processing...</div>}
      </div>
      : <div className='text-center flex justify-center items-center'>connect to Base GOERLI to Continue</div>}
    </div>
  )
}
