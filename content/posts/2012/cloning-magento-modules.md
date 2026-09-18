---
title: "Cloning magento modules"
date: 2012-08-01T12:37:00.000-04:00
lastmod: 2012-08-01T12:37:44.032-04:00
url: /2012/08/cloning-magento-modules.html
tags: ["development", "magento"]
---

Cloning magento modules will never this easy again.

Today I wanted (read was forced) to create a module based on one of Magento's core. Literally I needed to clone some of the Magento modules and while the copy and paste is simple stuff, going class by class and file by file renaming and configuring files is not joke.

So why do I need to clone it instead of just doing the usual OOP stuff Magento is so good at? Simply because the functionality is really different in most files and settings. So creating a payment method or paygate or giftcard module is easier when you have an skeleton to work with. Think about it, how different is paying with PayPal from Google Checkout? Functionality wise not that much, essentially they do the same thing but implement it differently.

I remember someone (I am talking to you Alan Storm) saying: "It's programming - come up with a canonical way of doing it, put it in a function and forget it about it".

So of course I decided that cloning magento modules was never going to be a hard task again.

So from today onward cloning magento modules is going to be pretty simple (a least to me).

Be warned there are some hard-coded paths here and little to none validation. Use at your own risk and needless to say don't use it on a production site. The script doesn't do about the app/etc/modules/module_name.xml so you have to do manually.

Copy the following code into a file and save as **clone**, no extensions needed:

```bash
#!/bin/bash

ORIGINAL_NAME=$1;
NEW_NAME=$2;
NAMESPACE="MyCompany";

#copy the module
`cp -R app/code/core/Mage/$ORIGINAL_NAME app/code/local/$NAMESPACE/$NEW_NAME`
#lowercase both the original name and new name
lowercase_orig=`echo $ORIGINAL_NAME | tr '[A-Z]' '[a-z]'`
lowercase_new=`echo $NEW_NAME | tr '[A-Z]' '[a-z]'`
#Rename the class declaration and stuff
`grep -lr "$ORIGINAL_NAME" "app/code/local/$NAMESPACE/$NEW_NAME/" | xargs -d "\n" sed -i "s/$ORIGINAL_NAME/$NEW_NAME/g"`
`grep -lr "Mage" "app/code/local/$NAMESPACE/$NEW_NAME/" | xargs -d "\n" sed -i "s/Mage/$NAMESPACE/g"`
#rename the  the shorcuts
`grep -lr "$lowercase_orig" "app/code/local/$NAMESPACE/$NEW_NAME/" | xargs -d "\n" sed -i "s/$lowercase_orig/$lowercase_new/g"`
#rename the files
`find "app/code/local/$NAMESPACE/$NEW_NAME" -name "*$ORIGINAL_NAME*" -exec rename "s/$ORIGINAL_NAME/$NEW_NAME/g" {} \;`
```

The trick here is to use find and grep to find the old module name and class shorcuts and use sed and rename to change it to the new one. Notice that tr is used to lowercase the old and new name because we are doing case sensitive searches. Also rename and sed are only replacing the portion of the text they find.

First let's make sure we can execute the file

```
chmod +x clone (only need to do this once) 
```

Then in the root of your Magento installation do:

./clone module1 module2

And then you will have it a brand new module cloned from Core to use as your starting point.
