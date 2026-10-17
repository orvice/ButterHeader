# RequestLoom Privacy Policy

Last updated: October 18, 2026

RequestLoom is a Chrome extension maintained by orvice for managing request and response headers and domain redirects through user-created profiles.

## Information handled by the extension

RequestLoom stores the configuration you enter: profile names, domain filters, header names and values, redirect rules, profile order, and enabled or paused states. Header values may include authentication tokens or other sensitive information if you choose to enter them.

The extension uses Chrome's declarativeNetRequest API to apply your rules. It does not maintain a browsing-history log, collect page contents, record request or response bodies, or send browsing activity to the developer. Applying your rules can add configured values to requests sent to the destinations you select or redirect requests to a configured destination.

## Storage and sharing

Configuration is stored using chrome.storage.sync. Chrome may sync this configuration, including header values, through your Google account according to your Chrome and Google settings. RequestLoom is not a password manager; avoid storing production credentials or secrets in profiles and use HTTPS destinations for sensitive values.

RequestLoom has no developer-operated backend, analytics, advertising, or telemetry. The developer does not receive or sell your configuration. Configuration is used only to provide the extension's header and redirect features. It is not used for advertising, creditworthiness, or lending decisions. User data is not transferred except as needed for the user-requested functionality described here. RequestLoom's use of user data follows the Chrome Web Store User Data Policy, including its Limited Use requirements.

JSON exports contain the configured values in readable form and are saved to the location you choose. Review and remove sensitive values before sharing an export. Importing appends profiles to your configuration.

## Control and retention

You can view, edit, disable, export, or delete profiles in the Options page. Deleting a profile removes its stored configuration through the Chrome Sync API. Global pause disables rule application but keeps configuration. Removing the extension does not delete files you previously exported; manage those files yourself. Google's handling and retention of synced information are governed by your Google settings and Google's policies.

## Permissions

- `declarativeNetRequest`: apply user-configured header changes and redirect rules in Chrome.
- `storage`: save profiles and preferences and synchronize them through Chrome Sync.
- Host access (`<all_urls>`): apply rules to the websites selected by the user, including wildcard domain filters and all-site profiles.

## Contact

For privacy questions, open an issue at https://github.com/orvice/ButterHeader/issues. Do not include credentials, tokens, or other private information in public issues.
