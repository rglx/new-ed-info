#!/bin/bash

# rglx's generalised daemonized app startup script
# v0.0.2, october 2021

service="new-ed-info"
pidFile="/home/bots/elite/new-ed-info/running.lck"
runningDirectory="/home/bots/elite/new-ed-info/"
processName="node"
processArguments="new-ed-info.js"
restartDelay="15" # in seconds. 0 disables, -1 waits for someone to press enter at the terminal.
runAsUser="bots" # doesnt actually run as the user, only checks if the user is this before allowing the server to run.


countdown(){ # countdown function from minecraft start script
	local OLD_IFS="${IFS}"
	IFS=":"
	local ARR=( $1 )
	local SECONDS=$((  (ARR[0] * 60 * 60) + (ARR[1] * 60) + ARR[2]  ))
	local START=$(date +%s)
	local END=$((START + SECONDS))
	local CUR=$START
	while [[ $CUR -lt $END ]]
	do
		CUR=$(date +%s)
		LEFT=$((END-CUR))
		printf "\r%02d:%02d:%02d" \
			$((LEFT/3600)) $(( (LEFT/60)%60)) $((LEFT%60))
		sleep 1
	done
	IFS="${OLD_IFS}"
	echo "        "
}

# okay, initial checks completed. now to try and start.
case "$1" in
	start)
		while true; do
			# starts our service in question
			toilet -F crop -F border "$service" | lolcat
			echo "starting the bot up..."
			broadcastmessage "$service started." &

			touch $pidFile
			$processName $processArguments

			# after our process exits, everything below here is run.
			rm $pidFile
			echo "ALERT! $service has stopped!"
			if [[ $restartDelay == "0" ]]; then
				echo "Not restarting. Shell exiting. Restart with ./$0"
				broadcastmessage ".\` :warning: \` Alert! $service stopped! NOT RESTARTING!!" &
				sleep 1
				exit 0
			elif [[ $restartDelay == "-1" ]]; then
				echo -e "Not restarting. Waiting for instruction.\nPress Enter to restart $service..."
				broadcastmessage ".\` :warning: \` Alert! $service stopped! NOT RESTARTING!!" &
				read unused
			else
				echo -e "Restarting $service automatically in...\n(Press Ctrl-C to cancel)"
				broadcastmessage ".\` :warning: \` Alert! $service stopped! Restarting!" &
				countdown "00:00:$restartDelay"
			fi
		done
	;;
	tmux)
		echo "Creating tmux session for $service..."
		tmux new-session -d -n $service -s $service bash
		echo "Session created! Attach to it with 'tmux a -t $service'"
	;;
	screen)
		echo "GNU screen is no longer supported. please install & configure tmux."
		exit 1
	;;
	restart)
		echo "not supported currently."
		exit 1
	;;
	help)
		echo "Usage: $0 [tmux/help]"
		echo " - tmux: creates a properly-named tmux session for the service to reside in."
		echo " - help: this page! - by rglx - visit https://rglx.me/ for more info"
		exit 0
	;;
	*)
		if [[ -f "$pidFile" ]]; then
			echo "ERROR: Server already running! Attach to the session with 'tmux a -t $service'"
			exit 1
		fi

		if [[ ! $STY == "" ]]; then
			echo "ERROR: screen is not supported. start this inside a tmux session."
			exit 1
		fi

		if [[ $TMUX == "" ]]; then
			echo "ERROR: start this inside tmux. use 'tmux a' to see if there's an existing session to attach to."
			exit 1
		fi

		if [[ ! $(whoami) == $runAsUser ]]; then # prevent people from running stuff under the wrong users
			clear
			echo -e "`toilet "HEY!"`\nERROR: Don't run this script as the wrong user!"| lolcat
			exit 1
		fi

		echo "Starting $service..."
		bash $0 start
	;;
esac
