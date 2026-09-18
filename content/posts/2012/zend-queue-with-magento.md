---
title: "Zend Queue with Magento"
date: 2012-08-01T12:53:00.000-04:00
lastmod: 2012-08-01T12:53:29.947-04:00
url: /2012/08/zend-queue-with-magento.html
tags: ["development", "magento", "zend framework"]
---

By using Zend Queue with magento we can create an event driven asynchronus integration system.

Just think about how much work you will offload from Magento when integrating with other systems and Magento itself.

To keep things simple, let's pretend that you send emails to your customers everytime a new product gets added. Usually these products get added during the day which also happens to be when your customers are most active buying in the site. An alert about a new product is very important but you don't want to bug down your email server. That's where Zend Queue comes to the rescue. In this example I am using mysql to store the queue. If you follow the same example remember to create the tables first, these can be found under: lib/Zend/Queue/Adapter/Db/mysql.sql

Also it will make more sense to use MemcacheQ or Apache ActiveMQ to offload mysql.

Here's an example:

In your observer class:

```
public function sendEmails($observer){
 Mage::helper('OfflineSync')->setEmailsOffline($observer->getData('object_container'));

}
```

Helper class

```
/*
* To change this template, choose Tools | Templates
* and open the template in the editor.
 */

/**
* Description of Data
 *
* @author letas
 */
class ZendQueue_OfflineSync_Helper_Data extends Mage_Core_Helper_Data {

    protected $_name = "general";
    protected $_registry = array();
    protected $_queue = null;

    protected function getQueue() {
        if (!isset($this->_registry[$this->_name])) {
            $db = simplexml_load_file('app' . DS . 'etc' . DS . 'local.xml');
            $db = $db->global->resources->default_setup->connection;
            $queueOptions = array(
                Zend_Queue::NAME => "{$this->_name}",
                'driverOptions' => array(
                    'host' => $db->host,
                    'port' => $db->port,
                    'username' => $db->username,
                    'password' => $db->password,
                    'dbname' => $db->dbname,
                    'type' => 'pdo_mysql',
                    Zend_Queue::TIMEOUT => 1,
                    Zend_Queue::VISIBILITY_TIMEOUT => 1
                )
            );
            //// Create a database queue
            $this->_registry[$this->_name] = new Zend_Queue('Db', $queueOptions);
        }
        return $this->_registry[$this->_name];
    }

    public function getEmailsOffline() {
        try {
            $this->_name = "offline_email";
            //cache here / singlenton
            $this->_queue = $this->getQueue();
            foreach ($this->_queue->receive(); as $i => $message) {
               //send the real mail now

    //delete this message
   $this->_queue->deleteMessage($message);
            }
        } catch (Exception $e) {
            Mage::logException($e);
            return -1;
        }
        return 1;
    }

    public function saveEmailsOffline($emails) {
        if (isset($emails)) {
            if (is_array($emails) || is_object($emails)) {
                $emails = serialize($emails);
            }
            $this->_name = "offline_email";
            //cache here / singlenton
            $this->getQueue()->send($emails);
        }
        return $this;
    }

}
```

Now you can also configure a crontab in your module config.xml, your code may look like this:

```
 Mage::helper('OfflineSync')->getEmailsOffline();
```

And you are done!!! Pretty simple right.

The possibilities are endless. Orders / Customer exports. Everything can be queued up.
