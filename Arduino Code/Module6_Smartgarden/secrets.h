#include <pgmspace.h>

#define SECRET

// THINNAME (created on AWS IoT Core) here... It will be the CLIENTID
#define THINGNAME "SmartGarderDevice"

// SSID and Password of your wifi network
const char WIFI_SSID[] = "MSI 6053";
const char WIFI_PASSWORD[] = "wifi1234";

// IOT ENDPOINT (created on AWS IOT Core) here... like it: xxxxxxxxxxx-ats.iot.us-east-1.amazonws.com
const char AWS_IOT_ENDPOINT[] = "agh6kxgv8jmup-ats.iot.ap-southeast-1.amazonaws.com";

// Amazon Root CA 1 - https://www.amazontrust.com/repository/AmazonRootCA1.pem
static const char AWS_CERT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----

-----END CERTIFICATE-----
)EOF";

// Device Certificate - Present in kit - name like this: THINGNAME.cert.pem
static const char AWS_CERT_CRT[] PROGMEM = R"KEY(
-----BEGIN CERTIFICATE-----

-----END CERTIFICATE-----
)KEY";

// Device Private Key - Present in kit - name like this: THINGNAME.private.key
static const char AWS_CERT_PRIVATE[] PROGMEM = R"KEY(
-----BEGIN RSA PRIVATE KEY-----

-----END RSA PRIVATE KEY-----
)KEY";