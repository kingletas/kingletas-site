---
title: "Connect to a wireless network through the command line"
date: 2012-07-28T17:21:00.000-04:00
lastmod: 2012-07-28T17:26:51.952-04:00
url: /2012/07/connect-to-wirless-network-through.html
tags: ["bash", "linux", "system administration", "ubuntu", "wireless"]
---

Sometimes you decide that you don't want to use any GUI to connect to your wireless network, especially when it doesn't seem to work.

One of the main benefits of Linux and any other Unix based operating system is its ability to empower users to do things on their own.
So tonight when the latest Ubuntu updates broke my laptop's wireless, I decided to write a little script to fix it.

You will need to know the following:

- ifconfig
- iwlist
- iwconfig
- dhclient

Find your network interface, unless you know it (my laptop is always wlan0)

```
ifconfig
```

if you don't see your network interface but you know it by hard try this:

```
ifconfig NETWORK_ID up
```

Find the network you want to connect to:

```
iwlist network_interface scan
```

Let' configure your network card

```
iwconfig NETWORK_ID essi "NAME" key s:password
```

or

```
iwconfig network_interface essi "NAME" key hex_password
```

Now all we need is to get the IP from the DHCP server:

```
dhclient network_interface
```

You could have it all in a script:

```bash
#!/bin/bash
ifconfig wlan0 up
iwconfig wlan0 essi "$1" key s:$2
dhclient wlan0
```

Save it as wireless_up and then chmod a+x wireless_up.

Now you just need to either do ./wireless_up network_id my_password or bash wireless_up network_id my_password in the same directory. You could also move the script to a global location or add the directory where you have it as part of your local path. The choice is yours.
