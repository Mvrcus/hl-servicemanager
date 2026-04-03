-- Sample organization
INSERT OR IGNORE INTO organizations (name, domain, about) VALUES
  ('Highlevel Solutions', 'highlevelsolutions.com', 'Internal team — GoHighLevel service provider helping agencies and users build out their setups.'),
  ('Demo Agency', 'demoagency.com', 'A demo agency account for testing the service manager.');

-- Sample tickets
INSERT INTO tickets (organization_id, subject, description, status, priority, submitted_by) VALUES
  (2, 'Need help setting up workflows', 'We need automation workflows set up for our lead nurture sequence. Should trigger on form submission and send a series of emails over 7 days.', 'open', 'high', 'jane@demoagency.com'),
  (2, 'Custom dashboard request', 'Can you build a custom reporting dashboard that shows our monthly lead stats and conversion rates?', 'in_progress', 'normal', 'jane@demoagency.com'),
  (2, 'Fix broken calendar integration', 'The Google Calendar sync stopped working last week. Appointments are not showing up.', 'open', 'high', 'bob@demoagency.com');

-- Sample comments
INSERT INTO comments (ticket_id, author, body) VALUES
  (2, 'admin', 'Working on this now — will have a draft ready by end of week.'),
  (2, 'jane@demoagency.com', 'Sounds great, thanks!');
