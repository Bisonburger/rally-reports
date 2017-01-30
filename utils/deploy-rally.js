var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .forBrowser('firefox','43')
    .build();

driver.get('https://agile.rms.ray.com/#/35308565/custom/35616181');
driver.wait(until.titleIs('Rally Login'), 1000);
driver.findElement( By.id('j_username') ).sendKeys( process.env.RALLY_USERNAME );
driver.findElement( By.id('j_password') ).sendKeys( process.env.RALLY_PASSWORD );
driver.findElement( By.id('login-button')).click();
driver.sleep(80000);

driver.findElement( By.id('ext-gen393') ).click();