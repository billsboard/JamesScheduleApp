import React, { useState, useEffect } from 'react';
import { SafeAreaView, FlatList, Text, View, RefreshControl, TextStyle, Button, ViewStyle } from 'react-native';
import axios from 'axios';
import moment from 'moment';
import ical from 'ical.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ICS_FEED_URL = 'https://wpga.myschoolapp.com/podium/feed/iCal.aspx?z=t%2bcIJVxxbhpwlyepyxWDYVTJdGb29zzPqURwaHO2N70SYMXJm5wmleKuAgOZ1%2bj3Z2796yp%2fQOpwViqZzhGsfw%3d%3d'; // Replace with actual ICS file URL

const CACHE_KEY = 'cached_ics_data';
const CACHE_DATE_KEY = 'cached_ics_date';

const App = () => {
  const [schedule, setSchedule] = useState<{ summary: string; start: Date; end: Date; description: string; }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>("");
  const [selectedDate, setSelectedDate] = useState(moment()); // Track the selected date

  useEffect(() => {
    loadCachedDataOrFetch(); // Load cached data or fetch new data when the app starts
  }, [selectedDate]);

  const loadCachedDataOrFetch = async () => {
    const cachedData = await AsyncStorage.getItem(CACHE_KEY);
    const cachedDate = await AsyncStorage.getItem(CACHE_DATE_KEY);
    
    const currentDateString = moment().format('YYYY-MM-DD');

    if (cachedData && cachedDate === currentDateString) {
      // Use cached data if it’s from today
      parseICSData(cachedData);
    } else {
      // Fetch new data if cache is missing or stale
      fetchSchedule(true); // Passing true to indicate a fresh fetch
    }
  };

  const fetchSchedule = async (isFreshFetch = false) => {
    setRefreshing(true);
    try {
      const response = await axios.get(ICS_FEED_URL);
      const calendarData = response.data;

      // Parse and store the fetched .ics file
      parseICSData(calendarData);

      if (isFreshFetch) {
        // Cache the data and the current date
        await AsyncStorage.setItem(CACHE_KEY, calendarData);
        await AsyncStorage.setItem(CACHE_DATE_KEY, moment().format('YYYY-MM-DD'));
      }

      setError(null);
    } catch (err) {
      setError("Failed to load schedule");
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const parseICSData = (calendarData: string) => {
    const jcalData = ical.parse(calendarData);
    const comp = new ical.Component(jcalData);
    const events = comp.getAllSubcomponents('vevent');

    // Filter events for the selected date
    const dateString = selectedDate.format('YYYY-MM-DD');
    const eventsForSelectedDay = events
      .map(event => {
        var parsed = new ical.Event(event);
        const summary = parsed.summary;
        const start = parsed.startDate.toJSDate();
        const end = parsed.endDate.toJSDate();
        const description = parsed.description;
        return { summary, start, end, description };
      })
      .filter(event =>
        moment(event.start).format('YYYY-MM-DD') === dateString
      );

    setSchedule(eventsForSelectedDay);
  };

  // Function to handle navigation between days
  const changeDay = (days: number) => {
    const newDate = selectedDate.clone().add(days, 'days');
    setSelectedDate(newDate);
  };

  const renderScheduleItem = ({ item }: { item: any }) => {
    const now = moment(); // Get the current time
    const isCurrent = now.isBetween(item.start, item.end); // Check if the event is happening now

    return (
      <View style={[styles.scheduleItem, isCurrent ? styles.currentEvent : null]}>
        <Text style={styles.title as TextStyle}>{item.summary}</Text>
        <Text style={styles.time}>
          {moment(item.start).format('hh:mm A')} - {moment(item.end).format('hh:mm A')}
        </Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header as TextStyle}>Schedule</Text>
      <Text style={styles.date as TextStyle}>{selectedDate.format('dddd, MMMM Do YYYY')}</Text>

      {/* Buttons to navigate between days */}
      <View style={styles.buttonContainer as ViewStyle}>
        <Button title="Previous Day" onPress={() => changeDay(-1)} />
        <Button title="Next Day" onPress={() => changeDay(1)} />
      </View>

      {error && <Text style={styles.error as TextStyle}>{error}</Text>}

      <FlatList
        data={schedule}
        renderItem={renderScheduleItem}
        keyExtractor={(item, index) => index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchSchedule(true)} />
        }
        ListEmptyComponent={<Text style={styles.emptyText as TextStyle}>No events for this day</Text>}
      />
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
    color: '#6c757d',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  scheduleItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  currentEvent: {
    backgroundColor: '#cce5ff', // Highlight the event in blue if it's occurring now
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  time: {
    fontSize: 16,
    color: '#007bff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6c757d',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    marginTop: 20,
  },
};

export default App;
